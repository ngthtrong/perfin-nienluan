#!/usr/bin/env python3
# Vai trò: Chạy PhoWhisper cục bộ để chuyển audio tiếng Việt thành transcript.
# Luồng chính: đổi audio về WAV mono 16 kHz, chạy pipeline và in JSON result cho Node.js.

import json
import os
import subprocess
import sys
import tempfile


def print_json(payload):
    print(json.dumps(payload, ensure_ascii=False))


# Chuyển mọi định dạng đầu vào về WAV mono 16 kHz mà model nhận ổn định.
def convert_to_wav(input_path):
    import imageio_ffmpeg

    output = tempfile.NamedTemporaryFile(prefix="perfin-audio-", suffix=".wav", delete=False)
    output.close()

    command = [
        imageio_ffmpeg.get_ffmpeg_exe(),
        "-y",
        "-i",
        input_path,
        "-ac",
        "1",
        "-ar",
        "16000",
        "-vn",
        output.name,
    ]
    subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, check=True)
    return output.name


# Nạp pipeline PhoWhisper, chạy transcription theo chunk và trả text đã chuẩn hóa.
def transcribe(audio_path):
    import soundfile as sf
    import torch
    from transformers import pipeline

    model_name = os.environ.get("PHOWHISPER_MODEL", "vinai/PhoWhisper-small")
    device = 0 if torch.cuda.is_available() else -1
    torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32

    pipe = pipeline(
        "automatic-speech-recognition",
        model=model_name,
        torch_dtype=torch_dtype,
        device=device,
    )
    array, sample_rate = sf.read(audio_path, dtype="float32")
    if len(getattr(array, "shape", [])) > 1:
        array = array.mean(axis=1)

    generate_kwargs = {"language": "vi", "task": "transcribe", "num_beams": 5}
    try:
        result = pipe(
            {"array": array, "sampling_rate": sample_rate},
            chunk_length_s=30,
            return_timestamps=False,
            generate_kwargs=generate_kwargs,
        )
    except (ValueError, TypeError):
        # Some PhoWhisper checkpoints don't accept language/task forcing; retry plainly.
        result = pipe(
            {"array": array, "sampling_rate": sample_rate},
            chunk_length_s=30,
            return_timestamps=False,
        )
    if isinstance(result, dict):
        return str(result.get("text") or "").strip(), result
    return str(result or "").strip(), result


def main():
    if len(sys.argv) < 2:
        print_json({"success": False, "error": "Missing audio path"})
        return 2

    input_path = sys.argv[1]
    if not os.path.exists(input_path):
        print_json({"success": False, "error": f"Audio not found: {input_path}"})
        return 2

    wav_path = None
    started = __import__("time").time()
    try:
        wav_path = convert_to_wav(input_path)
        text, raw = transcribe(wav_path)
        print_json({
            "success": True,
            "provider": "phowhisper",
            "text": text,
            "elapsed_ms": int((__import__("time").time() - started) * 1000),
            "raw": raw if isinstance(raw, dict) else None,
        })
        return 0
    except subprocess.CalledProcessError as exc:
        stderr = exc.stderr.decode("utf-8", errors="replace") if exc.stderr else str(exc)
        print_json({"success": False, "provider": "phowhisper", "error": f"ffmpeg conversion failed: {stderr[-1000:]}"})
        return 1
    except Exception as exc:
        print_json({"success": False, "provider": "phowhisper", "error": str(exc)})
        return 1
    finally:
        if wav_path and os.path.exists(wav_path):
            os.unlink(wav_path)


if __name__ == "__main__":
    raise SystemExit(main())
