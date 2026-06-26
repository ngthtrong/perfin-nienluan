#!/usr/bin/env python3

import json
import os
import subprocess
import sys
import tempfile


def print_json(payload):
    print(json.dumps(payload, ensure_ascii=False))


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

    result = pipe({"array": array, "sampling_rate": sample_rate}, chunk_length_s=30, return_timestamps=False)
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
    try:
        wav_path = convert_to_wav(input_path)
        text, raw = transcribe(wav_path)
        print_json({"success": True, "provider": "phowhisper", "text": text, "raw": raw if isinstance(raw, dict) else None})
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
