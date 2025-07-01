import os
from api import pdf_to_imgs_folder, img_to_markdown, process_data_to_vectordb, get_hash, query_vectordb

pdf = "D:/Projects/ChatWithPDF/backend/c4611_sample_explain.pdf"

hash_value = get_hash(pdf)

imgs_folder = pdf_to_imgs_folder(pdf, hash_value)

data = {}
total_pages = 0
for img in os.listdir(imgs_folder):
    markdown = img_to_markdown(os.path.join(imgs_folder, img))
    data[img] = markdown
    total_pages += 1

# Store data in vector database
process_data_to_vectordb(hash_value, data)

from utils import answer_generator
query = "What are the Features Demonstrated in pdf ?"

results = query_vectordb(hash_value, query)

answer = answer_generator(query, results)
print(answer)