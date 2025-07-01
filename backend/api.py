from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import os
import tempfile
from utils import (
    pdf_to_imgs_folder, 
    img_to_markdown, 
    process_data_to_vectordb, 
    get_hash, 
    query_vectordb, 
    keywords_extractor, 
    answer_generator
)

app = FastAPI(title="Chat with PDF API", description="API for processing PDFs and querying them")

class QueryRequest(BaseModel):
    hash: str
    query: str

class ProcessResponse(BaseModel):
    message: str
    hash: str
    total_pages: int

class QueryResponse(BaseModel):
    query: str
    keywords: str
    answer: str
    total_results: int

@app.post("/process", response_model=ProcessResponse)
async def process_pdf(file: UploadFile = File(...)):
    """
    Upload and process a PDF file to vector database
    """
    # Validate file type
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    try:
        # Create temporary file to save uploaded PDF
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_pdf_path = temp_file.name
        
        # Generate hash for the PDF
        hash_value = get_hash(temp_pdf_path)

        if os.path.exists(f"temp/{hash_value}"):
            total_pages = len(os.listdir(f"temp/{hash_value}"))
            return ProcessResponse(
                message="PDF already processed",
                hash=hash_value,
                total_pages=total_pages
            )
        
        # Convert PDF to images
        imgs_folder = pdf_to_imgs_folder(temp_pdf_path, hash_value)
        
        # Process images to markdown and collect data
        data = {}
        total_pages = 0
        for img in os.listdir(imgs_folder):
            markdown = img_to_markdown(os.path.join(imgs_folder, img))
            data[img] = markdown
            total_pages += 1
        
        # Store data in vector database
        process_data_to_vectordb(hash_value, data)
        
        # Clean up temporary file
        os.unlink(temp_pdf_path)
        
        return ProcessResponse(
            message="PDF processed successfully and stored in vector database",
            hash=hash_value,
            total_pages=total_pages
        )
        
    except Exception as e:
        # Clean up temporary file if it exists
        if 'temp_pdf_path' in locals():
            try:
                os.unlink(temp_pdf_path)
            except:
                pass
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")

@app.post("/query", response_model=QueryResponse)
async def query_pdf(request: QueryRequest):
    """
    Query the processed PDF using hash and query string
    """
    try:
        # Extract keywords from query
        keywords = keywords_extractor(request.query)
        keywords_list = keywords.split(",")
        answer = ""
        total_results = 0
        if len(keywords_list) < 3:
            answer = answer_generator(request.query, [])
        else:
            # Query vector database
            results = query_vectordb(request.hash, str(keywords))
            
            # Check if results exist
            if not results["documents"] or not results["documents"][0]:
                raise HTTPException(status_code=404, detail="No documents found for the given hash")
            
            # Generate answer
            answer = answer_generator(request.query, results["documents"][0])
            total_results = len(results["documents"][0])
        
        return QueryResponse(
            query=request.query,
            keywords=keywords,
            answer=answer,
            total_results=total_results
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error querying PDF: {str(e)}")

@app.get("/")
async def root():
    """
    Root endpoint with API information
    """
    return {
        "message": "Chat with PDF API",
        "endpoints": {
            "POST /process": "Upload and process a PDF file",
            "POST /query": "Query processed PDF using hash and query string"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 