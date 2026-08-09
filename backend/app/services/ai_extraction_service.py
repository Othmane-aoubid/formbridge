from openai import OpenAI
from app.core.config import settings
import logging
from typing import Dict, Any, Optional, Tuple
import json
import re
import time
from datetime import datetime

logger = logging.getLogger(__name__)


class AIExtractionService:
    FIELD_TYPE_HANDLERS = {
        "amount": "_normalize_amount",
        "total": "_normalize_amount",
        "date": "_normalize_date",
        "number": "_normalize_id",
        "id": "_normalize_id",
        "email": "_normalize_email",
    }

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
        document_type: str,
        return_timing: bool = False
    ) -> Dict[str, Any] | Tuple[Dict[str, Any], Dict[str, Any]]:
        """
        Use NVIDIA NIM API to extract structured fields from OCR text
        """
        timing = {}
        start_time = time.time()
        timing["ai_extraction_start"] = start_time
        
        if not self.client:
            logger.warning("NVIDIA NIM API client not configured, skipping AI extraction")
            return {}
        
        try:
            # Sanitize OCR text
            ocr_text = self._sanitize_ocr_text(ocr_text, timing)
            
            # Build prompt based on document type
            stage_start = time.time()
            prompt = self._build_extraction_prompt(ocr_text, document_type)
            timing["prompt_construction"] = time.time() - stage_start
            timing["prompt_characters"] = len(prompt)
            # Estimate tokens: ~4 characters per token for English text
            timing["prompt_estimated_tokens"] = len(prompt) // 4
            
            logger.info(f"Sending OCR text to AI extraction (length: {len(ocr_text)} chars)")
            
            # Conditionally increase max_tokens for large documents to prevent truncation
            if len(prompt) > 15000:
                max_tokens = 8000
            else:
                max_tokens = 4096
            
            completion = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                top_p=0.95,
                max_tokens=max_tokens,
                stream=False
            )
            
            content = completion.choices[0].message.content
            logger.info(f"AI response received (length: {len(content)} chars)")
            logger.info(f"AI response preview: {content[:500]}")
            
            # Parse the JSON response
            try:
                validated_fields = self._parse_ai_response(content, timing)
                timing["ai_extraction_total"] = time.time() - start_time
                if return_timing:
                    return validated_fields, timing
                return validated_fields
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse NVIDIA NIM response as JSON: {e}")
                logger.error(f"Content that failed to parse: {content}")
                timing["ai_extraction_error"] = str(e)
                timing["ai_extraction_total"] = time.time() - start_time
                if return_timing:
                    return {}, timing
                return {}
                    
        except Exception as e:
            return self._handle_extraction_error(e, timing, start_time, return_timing)
    
    def _validate_and_normalize_fields(self, fields: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate and normalize extracted fields
        """
        normalized = {}

        for key, value in fields.items():
            if value is None or value == "":
                continue

            # Normalize field names to camelCase
            normalized_key = self._normalize_field_name(key)
            normalized_key_lower = normalized_key.lower()

            # Find appropriate normalization function
            normalized_value = self._apply_field_handler(normalized_key_lower, value, key)

            # Default to string if no handler matched
            if normalized_value is None:
                normalized_value = str(value).strip()

            normalized[normalized_key] = normalized_value

        return normalized

    def _apply_field_handler(self, field_name_lower: str, value: Any, original_key: str) -> Optional[Any]:
        """
        Apply the appropriate normalization handler based on field name
        """
        for keyword, handler_name in self.FIELD_TYPE_HANDLERS.items():
            if keyword not in field_name_lower:
                continue

            handler = getattr(self, handler_name, None)
            if not handler:
                return None

            try:
                return handler(value)
            except Exception as e:
                logger.warning(f"Handler {handler_name} failed for field {original_key}: {e}")
                return None

        return None
    
    def _normalize_field_name(self, field_name: str) -> str:
        """
        Convert field name to camelCase
        """
        # Remove special characters and spaces
        cleaned = re.sub(r'[^a-zA-Z0-9\s]', '', field_name)
        # Convert to camelCase
        words = cleaned.split()
        if not words:
            return field_name
        return words[0].lower() + ''.join(word.capitalize() for word in words[1:])
    
    def _normalize_amount(self, value: Any) -> Optional[float]:
        """
        Normalize monetary amount to float
        """
        if isinstance(value, (int, float)):
            return float(value)
        
        if isinstance(value, str):
            # Remove currency symbols and commas
            cleaned = re.sub(r'[^\d.]', '', value)
            # Validate that cleaned string is a valid number
            if cleaned and cleaned.replace('.', '', 1).isdigit():
                try:
                    return float(cleaned)
                except ValueError:
                    logger.warning(f"Could not normalize amount: {value}")
                    return None
            logger.warning(f"Invalid amount format after cleaning: {value}")
            return None
        
        return None
    
    def _normalize_date(self, value: Any) -> Optional[str]:
        """
        Normalize date to ISO format (YYYY-MM-DD)
        """
        if isinstance(value, str):
            # Try common date formats
            date_formats = [
                '%Y-%m-%d',
                '%d/%m/%Y',
                '%m/%d/%Y',
                '%d-%m-%Y',
                '%m-%d-%Y',
                '%Y/%m/%d',
                '%d %b %Y',
                '%b %d, %Y',
            ]
            
            for fmt in date_formats:
                try:
                    parsed_date = datetime.strptime(value, fmt)
                    return parsed_date.strftime('%Y-%m-%d')
                except ValueError:
                    continue
            
            logger.warning(f"Could not normalize date: {value}")
            return None
        
        return None
    
    def _normalize_id(self, value: Any) -> str:
        """
        Normalize ID by removing spaces and special characters
        """
        if isinstance(value, str):
            return re.sub(r'[^a-zA-Z0-9-]', '', value)
        return str(value)
    
    def _normalize_email(self, value: Any) -> Optional[str]:
        """
        Validate and normalize email
        """
        if isinstance(value, str):
            email = value.strip().lower()
            if re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
                return email
            logger.warning(f"Invalid email format: {value}")
            return None
        return None
    
    def _sanitize_ocr_text(self, ocr_text: str, timing: Dict[str, Any]) -> str:
        """
        Sanitize OCR text - no truncation to ensure all pages are processed
        """
        stage_start = time.time()
        ocr_text = re.sub(r'[\x00-\x1f]', '', ocr_text)
        timing["ocr_sanitization"] = time.time() - stage_start
        timing["ocr_length"] = len(ocr_text)
        
        logger.info(f"Processing {len(ocr_text)} characters for AI extraction (no truncation)")
        
        return ocr_text
    
    def _parse_ai_response(self, content: str, timing: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse AI response, removing markdown code blocks and parsing JSON
        """
        # Strip markdown code blocks if present
        if content.startswith('```json'):
            content = content[7:]  # Remove ```json
        if content.startswith('```'):
            content = content[3:]  # Remove ```
        if content.endswith('```'):
            content = content[:-3]  # Remove closing ```
        content = content.strip()
        
        extracted_fields = json.loads(content)
        logger.info(f"Parsed JSON with keys: {list(extracted_fields.keys())}")
        
        # Validate and normalize extracted fields
        validated_fields = self._validate_and_normalize_fields(extracted_fields)
        
        logger.info(f"Successfully extracted {len(validated_fields)} fields using NVIDIA NIM")
        return validated_fields
    
    def _handle_extraction_error(
        self,
        error: Exception,
        timing: Dict[str, Any],
        start_time: float,
        return_timing: bool
    ) -> Dict[str, Any] | Tuple[Dict[str, Any], Dict[str, Any]]:
        """
        Centralized error handling for extraction failures
        """
        timing["ai_extraction_error"] = str(error)
        timing["ai_extraction_total"] = time.time() - start_time
        logger.error(f"Error calling NVIDIA NIM API: {str(error)}")
        logger.error(f"Full exception details: {type(error).__name__}")
        if return_timing:
            return {}, timing
        return {}
    
    def _build_extraction_prompt(self, ocr_text: str, document_type: str) -> str:
        """
        Build extraction prompt to extract ALL document content including tables and detailed text
        """
        # Flexible prompt that extracts whatever fields are present
        prompt = f"""Extract all structured data from this {document_type} document.

Text:
{ocr_text}

Return valid JSON with ALL fields found in the document as key-value pairs.
Include: names, dates, amounts, IDs, email addresses, phone numbers, addresses, and any other structured data.
Extract everything verbatim. No summaries. Return valid JSON only."""
        
        return prompt
