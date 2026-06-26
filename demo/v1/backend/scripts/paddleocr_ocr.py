#!/usr/bin/env python3

import json
import os
import sys


def print_json(payload):
    print(json.dumps(payload, ensure_ascii=False))


def collect_text(value, texts):
    if value is None:
        return

    if isinstance(value, dict):
        for key in ("rec_texts", "texts"):
            items = value.get(key)
            if isinstance(items, list):
                texts.extend(str(item).strip() for item in items if str(item).strip())
                return
        for key in ("text", "transcription"):
            item = value.get(key)
            if isinstance(item, str) and item.strip():
                texts.append(item.strip())
                return
        for item in value.values():
            collect_text(item, texts)
        return

    if isinstance(value, (list, tuple)):
        if len(value) >= 2 and isinstance(value[1], (list, tuple)) and value[1] and isinstance(value[1][0], str):
            text = value[1][0].strip()
            if text:
                texts.append(text)
            return
        for item in value:
            collect_text(item, texts)


def get_ocr_attempts(lang):
    return [
        {
            "lang": lang,
            "use_doc_orientation_classify": False,
            "use_doc_unwarping": False,
            "use_textline_orientation": False,
        },
        {
            "lang": lang,
            "ocr_version": "PP-OCRv5",
            "use_doc_orientation_classify": False,
            "use_doc_unwarping": False,
            "use_textline_orientation": False,
        },
        {"use_textline_orientation": False, "lang": lang},
        {"use_angle_cls": True, "lang": lang},
        {"lang": lang},
    ]


def run_ocr(ocr, image_path):
    if hasattr(ocr, "ocr"):
        try:
            return ocr.ocr(image_path, cls=True)
        except TypeError:
            return ocr.ocr(image_path)

    if hasattr(ocr, "predict"):
        return ocr.predict(input=image_path)

    raise RuntimeError("Unsupported PaddleOCR API")


def main():
    if len(sys.argv) < 2:
        print_json({"success": False, "error": "Missing image path"})
        return 2

    image_path = sys.argv[1]
    if not os.path.exists(image_path):
        print_json({"success": False, "error": f"Image not found: {image_path}"})
        return 2

    lang = os.environ.get("OCR_LANG", "vi")
    last_error = None
    try:
        from paddleocr import PaddleOCR

        for kwargs in get_ocr_attempts(lang):
            try:
                ocr = PaddleOCR(**kwargs)
                result = run_ocr(ocr, image_path)
                texts = []
                collect_text(result, texts)
                print_json({"success": True, "provider": "paddleocr", "text": "\n".join(texts), "raw": None})
                return 0
            except Exception as exc:
                last_error = exc
                continue
        raise last_error
    except Exception as exc:
        print_json({"success": False, "provider": "paddleocr", "error": str(exc)})
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
