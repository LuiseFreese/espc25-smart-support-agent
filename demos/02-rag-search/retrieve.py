import os
import json
from typing import List, Dict
from promptflow.core import tool
import requests

@tool
def retrieve(
    question: str,
    search_endpoint: str,
    search_key: str,
    search_index: str,
    top_k: int = 5
) -> List[Dict[str, str]]:
    """
    Retrieve relevant documents from Azure AI Search using hybrid search.
    """
    search_url = f"{search_endpoint}/indexes/{search_index}/docs/search?api-version=2023-11-01"

    headers = {
        "Content-Type": "application/json",
        "api-key": search_key
    }

    body = {
        "search": question,
        "queryType": "semantic",
        "semanticConfiguration": "semantic-config",
        "top": top_k,
        "select": "title,content,url"
    }

    response = requests.post(search_url, headers=headers, json=body)
    response.raise_for_status()

    results = response.json()

    contexts = []
    for idx, doc in enumerate(results.get("value", []), 1):
        contexts.append({
            "index": idx,
            "title": doc.get("title", ""),
            "content": doc.get("content", ""),
            "url": doc.get("url", "")
        })

    return contexts
