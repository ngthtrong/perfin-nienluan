import os
import zlib
import base64
import string
import urllib.request
import json
import re
import sys

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

def download_mermaid_content(content, output_path):
    url = "https://kroki.io/mermaid/png"
    try:
        req = urllib.request.Request(url, data=content.encode('utf-8'), headers={'User-Agent': 'Mozilla/5.0', 'Content-Type': 'text/plain'})
        with urllib.request.urlopen(req) as response:
            with open(output_path, 'wb') as f:
                f.write(response.read())
        print(f"Downloaded Mermaid to {output_path}")
    except Exception as e:
        print(f"Error downloading Mermaid: {e}")

def download_mermaid(mermaid_path, output_path):
    with open(mermaid_path, 'r', encoding='utf-8') as f:
        content = f.read()
    download_mermaid_content(content, output_path)

def extract_and_download_from_md(md_path, output_dir):
    try:
        with open(md_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"File not found: {md_path}")
        return

    pattern = r"```mermaid\n(.*?)\n```"
    matches = re.findall(pattern, content, re.DOTALL)
    
    base_name = os.path.splitext(os.path.basename(md_path))[0]
    if not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)
        
    print(f"Found {len(matches)} Mermaid diagrams in {md_path}")
    for i, match in enumerate(matches):
        output_filename = f"{base_name}_mermaid_{i+1}.png"
        output_path = os.path.join(output_dir, output_filename)
        print(f"Extracting diagram {i+1} from {base_name}...")
        download_mermaid_content(match.strip(), output_path)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # If args are provided, treat them as markdown files to extract diagrams from
        output_dir = "/home/ngthtrong/perfin-nienluan/doc/diagrams/img"
        for md_file in sys.argv[1:]:
            extract_and_download_from_md(md_file, output_dir)
    else:
        # Default behavior
        puml_src = "/home/ngthtrong/perfin-nienluan/doc/diagrams/puml/architecture.puml"
        mmd_src = "/home/ngthtrong/perfin-nienluan/doc/diagrams/mermaid/architecture.mmd"
        
        puml_dest = "/home/ngthtrong/perfin-nienluan/doc/diagrams/img/architecture_puml.png"
        mmd_dest = "/home/ngthtrong/perfin-nienluan/doc/diagrams/img/architecture_mmd.png"
        
        download_puml(puml_src, puml_dest)
        download_mermaid(mmd_src, mmd_dest)
