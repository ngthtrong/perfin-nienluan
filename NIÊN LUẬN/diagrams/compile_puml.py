import os
import zlib
import base64
import string
import urllib.request
import re

def plantuml_encode(plantuml_text):
    """Compress and encode PlantUML text for the server."""
    utf8_text = plantuml_text.encode('utf-8')
    # Compress using Deflate (zlib)
    # The [2:-4] slice removes the zlib header and checksum
    zlibbed_str = zlib.compress(utf8_text)[2:-4]
    
    # Custom Base64-like transformation
    plantuml_alphabet = string.digits + string.ascii_uppercase + string.ascii_lowercase + '-_'
    base64_alphabet = string.ascii_uppercase + string.ascii_lowercase + string.digits + '+/'
    
    # Create translation table
    b64_to_plantuml = bytes.maketrans(base64_alphabet.encode('utf-8'), plantuml_alphabet.encode('utf-8'))
    
    # Base64 encode and translate
    return base64.b64encode(zlibbed_str).translate(b64_to_plantuml).decode('utf-8')

def download_png(encoded_url, output_path):
    """Download PNG from PlantUML server."""
    url = f"http://www.plantuml.com/plantuml/png/{encoded_url}"
    print(f"Downloading from: {url} -> {output_path}")
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req) as response:
            with open(output_path, 'wb') as f:
                f.write(response.read())
        print("Success!")
        return True
    except Exception as e:
        print(f"Failed to download: {e}")
        return False

def parse_and_compile(puml_path, output_dir, name_prefix=""):
    """Parse a .puml file and compile each block to PNG."""
    print(f"\nProcessing {puml_path}...")
    with open(puml_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find all @startuml ... @enduml blocks
    blocks = re.findall(r'(@startuml.*?@enduml)', content, re.DOTALL)
    print(f"Found {len(blocks)} blocks.")
    
    for i, block in enumerate(blocks):
        # Extract title or name if possible to name the file
        title_match = re.search(r'title\s+\*?\*?(.*?)\*?\*?(?:\n|$)', block, re.IGNORECASE)
        name_match = re.search(r'@startuml\s+(\w+)', block)
        
        # Clean title for filename
        if title_match:
            title = title_match.group(1).strip()
            # Remove markdown bold/italics
            title = re.sub(r'[*_]', '', title)
            # Remove trailing/leading spaces and replace special characters with hyphens
            filename_part = re.sub(r'[^\w\s-]', '', title).strip()
            filename_part = re.sub(r'[-\s]+', '-', filename_part).lower()
        elif name_match:
            filename_part = name_match.group(1).strip().lower()
        else:
            filename_part = f"diagram-{i+1}"
            
        # Strip numbering prefix like "1-", "2-", etc.
        filename_part = re.sub(r'^\d+-\s*', '', filename_part)
        filename_part = re.sub(r'^luồng-\d+-\s*', '', filename_part)
        
        # Avoid empty names or weird names
        if not filename_part or filename_part in ['activity-diagrams']:
            # Skip dummy blocks or empty names
            continue
            
        filename = f"{name_prefix}{filename_part}.png"
        output_path = os.path.join(output_dir, filename)
        
        # Compile
        encoded = plantuml_encode(block)
        download_png(encoded, output_path)

def main():
    puml_dir = "/home/ngthtrong/perfin-nienluan/NIÊN LUẬN/diagrams/puml"
    output_dir = "/home/ngthtrong/perfin-nienluan/NIÊN LUẬN/latex/images"
    
    os.makedirs(output_dir, exist_ok=True)
    
    # 1. Compile simple files
    simple_files = {
        "class-diagram.puml": "class-diagram.png",
        "component-diagram.puml": "component-diagram.png",
        "use-case-overview.puml": "use-case-overview.png", # also save as use-case-diagram.png
        "use-case-core.puml": "use-case-core.png",
        "use-case-ai.puml": "use-case-ai.png",
        "use-case-system.puml": "use-case-system.png",
    }
    
    for filename, output_name in simple_files.items():
        path = os.path.join(puml_dir, filename)
        if os.path.exists(path):
            print(f"\nProcessing {filename}...")
            with open(path, 'r', encoding='utf-8') as f:
                block = f.read()
            encoded = plantuml_encode(block)
            download_png(encoded, os.path.join(output_dir, output_name))
            if filename == "use-case-overview.puml":
                # Duplicate as use-case-diagram.png
                download_png(encoded, os.path.join(output_dir, "use-case-diagram.png"))
                
    # 2. Compile and split files with multiple blocks
    parse_and_compile(os.path.join(puml_dir, "sequence-diagrams.puml"), output_dir, name_prefix="sequence-")
    parse_and_compile(os.path.join(puml_dir, "activity-diagrams.puml"), output_dir, name_prefix="activity-")

if __name__ == "__main__":
    main()
