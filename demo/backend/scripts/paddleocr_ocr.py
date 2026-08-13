#!/usr/bin/env python3
# Vai trò: Chạy PaddleOCR cục bộ để trích văn bản từ ảnh hóa đơn.
# Luồng chính: tiền xử lý ảnh, thử các cấu hình OCR và in đúng một JSON result cho Node.js.

import json
import os
import sys
import time


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


# Preprocess the receipt image to improve OCR accuracy: convert to grayscale, upscale small
# images, and boost contrast. Returns a path to the processed image (or the original on failure).
# Làm sạch ảnh đầu vào để chữ hóa đơn nhỏ và xoay theo EXIF dễ nhận dạng hơn.
def preprocess_image(image_path):
    try:
        from PIL import Image, ImageOps, ImageEnhance
    except Exception:
        return image_path

    try:
        img = Image.open(image_path)
        img = ImageOps.exif_transpose(img)
        img = img.convert("L")
        # Upscale narrow images so small receipt fonts are legible
        if img.width < 1000:
            scale = 1000 / img.width
            img = img.resize((1000, int(img.height * scale)), Image.LANCZOS)
        img = ImageEnhance.Contrast(img).enhance(1.5)
        img = img.convert("RGB")
        out_path = image_path + ".pre.png"
        img.save(out_path)
        return out_path
    except Exception:
        return image_path


def get_ocr_attempts(lang):
    # Best-quality config first; only fall back if it raises.
    return [
        {
            "lang": lang,
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
    started = time.time()
    processed_path = preprocess_image(image_path)
    last_error = None
    try:
        from paddleocr import PaddleOCR

        for kwargs in get_ocr_attempts(lang):
            try:
                ocr = PaddleOCR(**kwargs)
                result = run_ocr(ocr, processed_path)
                texts = []
                collect_text(result, texts)
                print_json({
                    "success": True,
                    "provider": "paddleocr",
                    "text": "\n".join(texts),
                    "elapsed_ms": int((time.time() - started) * 1000),
                    "raw": None,
                })
                return 0
            except Exception as exc:
                last_error = exc
                continue
        raise last_error
    except Exception as exc:
        print_json({"success": False, "provider": "paddleocr", "error": str(exc)})
        return 1
    finally:
        if processed_path != image_path and os.path.exists(processed_path):
            try:
                os.unlink(processed_path)
            except OSError:
                pass


if __name__ == "__main__":
    raise SystemExit(main())
