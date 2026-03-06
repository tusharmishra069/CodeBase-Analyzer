import os
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_core.documents import Document
from groq import Groq
import json
import re

class CodeAnalyzer:
    def __init__(self):
        # We use a fast, local embedding model from HuggingFace to avoid API costs on massive codebases
        self.embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        self.groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        
    def create_vector_store(self, code_documents: list[dict]):
        """
        Takes raw codebase files, chunks them logically, and stores them in a FAISS vector store.
        """
        print("Chunking documents...")
        # Code usually needs specific splitting strategies. We use RecursiveCharacterTextSplitter 
        # tuned slightly for code (looking for newlines, brackets, etc.)
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=800,
            chunk_overlap=50,
            separators=["\nclass ", "\ndef ", "\nfunction ", "\n\n", "\n", " ", ""]
        )
        
        docs = []
        for doc in code_documents:
            chunks = text_splitter.split_text(doc["content"])
            for chunk in chunks:
                docs.append(Document(
                    page_content=chunk,
                    metadata={"source": doc["path"]}
                ))
        
        print(f"Created {len(docs)} chunks. Embedding into FAISS...")
        # Create the vector store
        vectorstore = FAISS.from_documents(
            documents=docs, 
            embedding=self.embeddings
        )
        
        return vectorstore

    def analyze_codebase(self, vectorstore) -> dict:
        """
        Queries the Groq LLM using the vector store for context to generate a comprehensive report.
        """
        # Let's get the 5 most central/important chunks to represent the core architecture
        retriever = vectorstore.as_retriever(search_kwargs={"k": 5})
        docs = retriever.invoke("core architecture main logic API database setup configuration")
        
        context = "\n\n".join([f"--- FILE: {doc.metadata['source']} ---\n{doc.page_content}" for doc in docs])
        
        prompt = f"""
        You are an expert Principal Software Engineer performing a code review. 
        Analyze the following segments of a larger codebase. 

        CODE CONTEXT:
        {context}

        INSTRUCTIONS:
        Based solely on the provided context, please output a JSON object representing your code review.
        The JSON MUST have the exact following structure:
        {{
            "health_score": "A string containing a letter grade (A+, A, B, C, D, F)",
            "architecture_summary": "A concise paragraph explaining the tech stack, key components, and how they relate.",
            "bugs": [
                {{"title": "Bug name", "description": "Specific explanation and location"}}
            ],
            "improvements": [
                {{"title": "Improvement title", "description": "Specific refactoring or architectural suggestion"}}
            ]
        }}
        
        IMPORTANT: Return ONLY valid, parseable JSON. Do not include markdown blocks like ```json.
        """

        print("Querying Groq LLM for codebase insight...")
        chat_completion = self.groq_client.chat.completions.create(
            messages=[{"role": "system", "content": prompt}],
            model="llama-3.1-8b-instant",  # Very fast open source model on Groq
            temperature=0.2
        )
        
        response_text = chat_completion.choices[0].message.content.strip()
        
        # Clean up in case the LLM returned markdown despite instructions
        try:
            start = response_text.find('{')
            end = response_text.rfind('}') + 1
            if start != -1 and end != 0:
                response_text = response_text[start:end]
            return json.loads(response_text)
        except json.JSONDecodeError as e:
            print(f"Failed to parse LLM response as JSON: {response_text}")
            return {
                "health_score": "N/A",
                "architecture_summary": "Failed to parse architecture summary from LLM.",
                "bugs": [],
                "improvements": []
            }
