from pdf2image import convert_from_path
import os
import hashlib
import chromadb
from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI
from langchain_huggingface import HuggingFaceEmbeddings
from docling.document_converter import DocumentConverter
from typing import List
import chromadb.utils.embedding_functions as embedding_functions
from dotenv import load_dotenv

load_dotenv()

model = ChatOpenAI(
    model="gpt-4o",
    api_key=os.getenv("OPENAI_API_KEY"),
    temperature=0.0,
    max_tokens=1000
)

class HuggingFaceEmbeddingFunction(embedding_functions.EmbeddingFunction):
    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        self.model = HuggingFaceEmbeddings(model_name=model_name)
    
    def __call__(self, input: List[str]) -> List[List[float]]:
        return self.model.embed_documents(input)

def get_hash(pdf_path):
    return hashlib.md5(open(pdf_path, 'rb').read()).hexdigest()

def pdf_to_imgs_folder(pdf_path, hash):
    images = convert_from_path(pdf_path)
    temp_folder = "temp"
    os.makedirs(temp_folder, exist_ok=True)
    for i in range(len(images)):
        os.makedirs(f'{temp_folder}/{hash}', exist_ok=True)
        images[i].save(f'{temp_folder}/{hash}/'+ str(i) +'.jpg', 'JPEG')
    document_path = f'{temp_folder}/{hash}'
    print("Extracting images from PDF... to "+document_path)    
    return document_path

#############################################################################

def img_to_markdown(document_path):
    converter = DocumentConverter()
    result = converter.convert(document_path)
    result = result.document.export_to_markdown()
    print("Markdown: "+result)
    return result

#############################################################################

def process_data_to_vectordb(collection_name, data):
    client = chromadb.PersistentClient(path="chroma_db")
    embedding_function = HuggingFaceEmbeddingFunction(model_name="sentence-transformers/all-MiniLM-L6-v2")
    collection = client.get_or_create_collection(name=collection_name, embedding_function=embedding_function)

    # Convert data to proper format for ChromaDB
    documents = list(data.values())  # Convert dict_values to list
    metadatas = [{"source": key} for key in data.keys()]  # Create metadata dicts
    ids = list(data.keys())  # Convert dict_keys to list
    
    collection.add(
        documents=documents,
        metadatas=metadatas,
        ids=ids
    )

#############################################################################

def query_vectordb(collection_name, query):
    client = chromadb.PersistentClient(path="chroma_db")
    collection = client.get_collection(name=collection_name)
    results = collection.query(
        query_texts=[query],
        n_results=5
    )
    return results

#############################################################################

def keywords_extractor(query):
    prompt = f"""
    You are a helpful assistant that extracts keywords from a query that i can pass to ChromaDB vector database.
    Correct english spellings.
    Extract Keywords from the query.
    The query is: {query}
    RETURN THE KEYWORDS IN A LIST.
    Example:
    keyword1, keyword2, keyword3
    Give minimum 3 keywords.

    If User just says Hello, Hi , etc. then return nothing or empty list.
    Example: 
    NO PREAMBLE ONLY THE KEYWORDS IN A LIST.
    Don't add []
    """
    response = model.invoke(prompt)
    return response.content

#############################################################################

def answer_generator(query, vector_db_results):
    prompt = f"""
    You are a helpful assistant that generates an answer to a query based on the vector database results.
    The query is: {query}
    The vector database results are: {vector_db_results}
    The answer is:
    """
    if len(vector_db_results) < 3:
        prompt = f"""
            As we don't have any results from the vector database, we will use the query to generate an answer.
            Reply user that we don't have any results from the vector database.
            Please provide a detailed answer to the query.

            If user has said Hello, reply with a greeting.
            If User has said anything else, reply with a greeting.
        """
    response = model.invoke(prompt)
    return response.content
