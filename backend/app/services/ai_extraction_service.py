from openai import OpenAI
from app.core.config import settings
import logging
from typing import Dict, Any, Optional
import json

logger = logging.getLogger(__name__)


class AIExtractionService:
    def __init__(self):
        self.api_key = settings.nvidia_nim_api_key
        self.base_url = "https://integrate.api.nvidia.com/v1"
        self.model = settings.nvidia_nim_model
        self.client = None
        
        if self.api_key:
            self.client = OpenAI(
                base_url=self.base_url,
                api_key=self.api_key
            )
    
    async def extract_fields_from_ocr(
        self,
        ocr_text: str,
        document_type: str
    ) -> Dict[str, Any]:
        """
        Use NVIDIA NIM API to extract structured fields from OCR text
        """
        if not self.client:
            logger.warning("NVIDIA NIM API client not configured, skipping AI extraction")
            return {}
        
        try:
            # Build prompt based on document type
            prompt = self._build_extraction_prompt(ocr_text, document_type)
            
            completion = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                top_p=0.95,
                max_tokens=16384,
                extra_body={"chat_template_kwargs": {"thinking": False}},
                stream=False
            )
            
            content = completion.choices[0].message.content
            
            # Parse the JSON response
            try:
                extracted_fields = json.loads(content)
                logger.info(f"Successfully extracted {len(extracted_fields)} fields using NVIDIA NIM")
                return extracted_fields
            except json.JSONDecodeError:
                logger.error(f"Failed to parse NVIDIA NIM response as JSON: {content}")
                return {}
                    
        except Exception as e:
            logger.error(f"Error calling NVIDIA NIM API: {str(e)}")
            return {}
    
    def _build_extraction_prompt(self, ocr_text: str, document_type: str) -> str:
        """
        Build extraction prompt based on document type
        """
        base_prompt = f"""
Extract structured fields from the following OCR text of a {document_type} document.

OCR Text:
{ocr_text}

Return the extracted fields as a JSON object. Only return valid JSON, no explanations.
"""
        
        # Add specific instructions based on document type
        if document_type == "invoice":
            base_prompt += """
Focus on extracting: vendor name, invoice number, invoice date, total amount, line items, tax, etc.
"""
        elif document_type == "receipt":
            base_prompt += """
Focus on extracting: merchant name, date, total amount, items purchased, payment method, etc.
"""
        elif document_type == "contract":
            base_prompt += """
Focus on extracting: parties involved, contract dates, terms, amounts, clauses, etc.
"""
        elif document_type == "other":
            base_prompt += """
Extract all key-value pairs and structured information present in the document. Look for fields like names, IDs, dates, amounts, addresses, etc.
"""
        
        return base_prompt
