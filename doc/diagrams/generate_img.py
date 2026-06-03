import os
import zlib
import base64
import string
import urllib.request
import json

def plantuml_encode(plantuml_text):
    utf8_text = plantuml_text.encode('utf-8')
    zlibbed_str = zlib.compress(utf8_text)[2:-4]
    
    plantuml_alphabet = string.digits + string.ascii_uppercase + string.ascii_lowercase + '-_'
    base64_alphabet = string.ascii_uppercase + string.ascii_lowercase + string.digits + '+/'
    
    b64_to_plantuml = bytes.maketrans(base64_alphabet.encode('utf-8'), plantuml_alphabet.encode('utf-8'))
    
    return base64.b64encode(zlibbed_str).translate(b64_to_plantuml).decode('utf-8')

def download_puml(puml_path, output_path):
    with open(puml_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    encoded = plantuml_encode(content)
    url = f"http://www.plantuml.com/plantuml/png/{encoded}"
    
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            with open(output_path, 'wb') as f:
                f.write(response.read())
        print(f"Downloaded PlantUML to {output_path}")
    except Exception as e:
        print(f"Error downloading PlantUML: {e}")

def download_mermaid(mermaid_path, output_path):
    with open(mermaid_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Payload for kroki (supports mermaid rendering)
    url = "https://kroki.io/mermaid/png"
    try:
        req = urllib.request.Request(url, data=content.encode('utf-8'), headers={'User-Agent': 'Mozilla/5.0', 'Content-Type': 'text/plain'})
        with urllib.request.urlopen(req) as response:
            with open(output_path, 'wb') as f:
                f.write(response.read())
        print(f"Downloaded Mermaid to {output_path}")
    except Exception as e:
        print(f"Error downloading Mermaid: {e}")

if __name__ == "__main__":
    puml_src = "/home/ngthtrong/perfin-nienluan/doc/diagrams/puml/architecture.puml"
    mmd_src = "/home/ngthtrong/perfin-nienluan/doc/diagrams/mermaid/architecture.mmd"
    
    puml_dest = "/home/ngthtrong/perfin-nienluan/doc/diagrams/img/architecture_puml.png"
    mmd_dest = "/home/ngthtrong/perfin-nienluan/doc/diagrams/img/architecture_mmd.png"
    
    download_puml(puml_src, puml_dest)
    download_mermaid(mmd_src, mmd_dest)
