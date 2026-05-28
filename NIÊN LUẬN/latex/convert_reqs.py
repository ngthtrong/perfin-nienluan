import os
import re

# Paths
REQ_DIR = '/home/ngthtrong/perfin-nienluan/NIÊN LUẬN/requirements'
LATEX_REQ_DIR = '/home/ngthtrong/perfin-nienluan/NIÊN LUẬN/latex/requirements'

os.makedirs(LATEX_REQ_DIR, exist_ok=True)

def escape_latex(text, in_table=False):
    # 1. Escape %
    text = re.sub(r'(?<!\\)%', r'\%', text)
    # 2. Escape $
    text = re.sub(r'(?<!\\)\$', r'\$', text)
    # 3. Escape #
    text = re.sub(r'(?<!\\)#', r'\#', text)
    # 4. Escape _ (except when it's already escaped or in math)
    text = re.sub(r'(?<!\\)_', r'\_', text)
    # 5. Escape & (always escape ampersands to avoid extra column tabs in tables)
    text = re.sub(r'(?<!\\)&', r'\&', text)
    
    # Custom symbols
    text = text.replace('⚠️', '\\warningicon\\ ')
    text = text.replace('✅', '\\checkicon\\ ')
    
    # GHERKIN\_BR replacement (since _ became \_)
    text = text.replace('GHERKIN\\_BR', ' \\\\ \\hspace*{1.5em} ')
    return text

def preprocess_gherkin(content):
    # Replace non-breaking spaces with spaces
    content = content.replace('\xa0', ' ')
    
    lines = content.split('\n')
    new_lines = []
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        
        # Check if this line starts a Given block
        if stripped.startswith('- Given') or stripped.startswith('* Given') or stripped.startswith('- GIVEN') or stripped.startswith('* GIVEN'):
            gherkin_block = [line]
            j = i + 1
            while j < len(lines):
                next_line = lines[j]
                next_stripped = next_line.strip()
                if next_stripped == '':
                    j += 1
                    continue
                # If the next non-empty line starts with When, Then, And, or But
                if (next_stripped.startswith('When ') or next_stripped.startswith('Then ') or 
                    next_stripped.startswith('And ') or next_stripped.startswith('But ') or
                    next_stripped.startswith('WHEN ') or next_stripped.startswith('THEN ') or 
                    next_stripped.startswith('AND ') or next_stripped.startswith('BUT ')):
                    gherkin_block.append(next_line)
                    j += 1
                else:
                    break
            
            if len(gherkin_block) > 1:
                # Merge into a single item
                merged_content = gherkin_block[0]
                # Bold "Given" in the first line
                for kw in ['Given', 'GIVEN']:
                    if kw in merged_content:
                        merged_content = merged_content.replace(kw, f"**{kw}**", 1)
                        break
                
                for clause in gherkin_block[1:]:
                    clause_stripped = clause.strip()
                    # Bold Gherkin keywords
                    for keyword in ['When', 'Then', 'And', 'But', 'WHEN', 'THEN', 'AND', 'BUT']:
                        if clause_stripped.startswith(keyword):
                            clause_stripped = clause_stripped.replace(keyword, f"**{keyword}**", 1)
                            break
                    merged_content += " GHERKIN_BR " + clause_stripped
                
                new_lines.append(merged_content)
                i = j
                continue
        
        new_lines.append(line)
        i += 1
        
    return '\n'.join(new_lines)

def convert_md_to_latex(md_content):
    # Preprocess Gherkin
    md_content = preprocess_gherkin(md_content)
    
    lines = md_content.split('\n')
    latex_lines = []
    
    # State tracking
    in_front_matter = False
    in_list = False
    list_type = None  # 'itemize' or 'enumerate'
    list_indent = -1
    
    in_table = False
    table_headers = []
    table_rows = []
    
    in_quote = False
    
    # Strip leading front matter
    i = 0
    if len(lines) > 0 and lines[0].strip() == '---':
        in_front_matter = True
        i += 1
        while i < len(lines) and lines[i].strip() != '---':
            i += 1
        i += 1  # Skip the closing '---'

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        
        # 1. Handle headers
        if stripped.startswith('# '):
            title = stripped[2:].strip()
            if in_list: latex_lines.append(f"\\end{{{list_type}}}"); in_list = False
            if in_table: latex_lines.extend(format_table(table_headers, table_rows)); in_table = False
            if in_quote: latex_lines.append("\\end{quote}"); in_quote = False
            
            latex_lines.append(f"\\section{{{escape_latex(title)}}}")
            i += 1
            continue
            
        elif stripped.startswith('## '):
            title = stripped[3:].strip()
            if in_list: latex_lines.append(f"\\end{{{list_type}}}"); in_list = False
            if in_table: latex_lines.extend(format_table(table_headers, table_rows)); in_table = False
            if in_quote: latex_lines.append("\\end{quote}"); in_quote = False
            
            latex_lines.append(f"\\subsection{{{escape_latex(title)}}}")
            i += 1
            continue
            
        elif stripped.startswith('### '):
            title = stripped[4:].strip()
            if in_list: latex_lines.append(f"\\end{{{list_type}}}"); in_list = False
            if in_table: latex_lines.extend(format_table(table_headers, table_rows)); in_table = False
            if in_quote: latex_lines.append("\\end{quote}"); in_quote = False
            
            latex_lines.append(f"\\subsubsection{{{escape_latex(title)}}}")
            i += 1
            continue
            
        elif stripped.startswith('#### '):
            title = stripped[5:].strip()
            if in_list: latex_lines.append(f"\\end{{{list_type}}}"); in_list = False
            if in_table: latex_lines.extend(format_table(table_headers, table_rows)); in_table = False
            if in_quote: latex_lines.append("\\end{quote}"); in_quote = False
            
            latex_lines.append(f"\\paragraph{{{escape_latex(title)}}}")
            i += 1
            continue

        # 2. Handle tables
        if stripped.startswith('|'):
            if in_list: latex_lines.append(f"\\end{{{list_type}}}"); in_list = False
            if in_quote: latex_lines.append("\\end{quote}"); in_quote = False
            
            if not in_table:
                in_table = True
                table_headers = [c.strip() for c in line.split('|')[1:-1]]
                table_rows = []
                if i + 1 < len(lines) and re.match(r'^\s*\|\s*:?-+:?\s*\|', lines[i+1]):
                    i += 2  # skip current and next line
                    continue
            else:
                row_cells = [c.strip() for c in line.split('|')[1:-1]]
                table_rows.append(row_cells)
            i += 1
            continue
        elif in_table:
            latex_lines.extend(format_table(table_headers, table_rows))
            in_table = False

        # 3. Handle Blockquotes
        if stripped.startswith('>'):
            if in_list: latex_lines.append(f"\\end{{{list_type}}}"); in_list = False
            if in_table: latex_lines.extend(format_table(table_headers, table_rows)); in_table = False
            
            content = stripped[1:].strip()
            if not in_quote:
                in_quote = True
                latex_lines.append("\\begin{quote}")
            
            formatted = format_inline_styles(content)
            latex_lines.append(escape_latex(formatted))
            i += 1
            continue
        elif in_quote:
            latex_lines.append("\\end{quote}")
            in_quote = False

        # 4. Handle Lists
        ul_match = re.match(r'^(\s*)([-\*])\s+(.*)$', line)
        ol_match = re.match(r'^(\s*)(\d+)\.\s+(.*)$', line)
        
        if ul_match or ol_match:
            if in_table: latex_lines.extend(format_table(table_headers, table_rows)); in_table = False
            if in_quote: latex_lines.append("\\end{quote}"); in_quote = False
            
            indent = len(ul_match.group(1)) if ul_match else len(ol_match.group(1))
            content = ul_match.group(3) if ul_match else ol_match.group(3)
            current_type = 'itemize' if ul_match else 'enumerate'
            
            if not in_list:
                in_list = True
                list_type = current_type
                list_indent = indent
                latex_lines.append(f"\\begin{{{list_type}}}")
            elif indent > list_indent:
                latex_lines.append(f"\\begin{{{current_type}}}")
            elif indent < list_indent:
                latex_lines.append(f"\\end{{{list_type}}}")
                list_indent = indent
            
            formatted = format_inline_styles(content)
            latex_lines.append(f"\\item {escape_latex(formatted)}")
            i += 1
            continue
        elif in_list and stripped == "":
            i += 1
            continue
        elif in_list and not (ul_match or ol_match) and line.startswith(' ' * (list_indent + 2)):
            formatted = format_inline_styles(line.strip())
            latex_lines.append(escape_latex(formatted))
            i += 1
            continue
        elif in_list:
            latex_lines.append(f"\\end{{{list_type}}}")
            in_list = False

        # 5. Normal line
        if stripped == "":
            latex_lines.append("")
        else:
            formatted = format_inline_styles(line)
            latex_lines.append(escape_latex(formatted))
        
        i += 1

    if in_list: latex_lines.append(f"\\end{{{list_type}}}")
    if in_table: latex_lines.extend(format_table(table_headers, table_rows))
    if in_quote: latex_lines.append("\\end{quote}")

    return '\n'.join(latex_lines)

def format_inline_styles(text):
    text = re.sub(r'\*\*(.*?)\*\*', r'\\textbf{\1}', text)
    text = re.sub(r'\*(.*?)\*', r'\\textit{\1}', text)
    text = re.sub(r'`(.*?)`', r'\\texttt{\1}', text)
    return text

def format_table(headers, rows):
    if not headers:
        return []
    
    num_cols = len(headers)
    col_spec = "|" + "X|" * num_cols
    if num_cols == 2:
        col_spec = "|l|X|"
    elif num_cols == 3:
        col_spec = "|l|l|X|"
    elif num_cols > 3:
        col_spec = "|" + "X|" * num_cols
        
    latex = []
    latex.append("\\begin{table}[htbp]")
    latex.append("\\centering")
    latex.append(f"\\begin{{tabularx}}{{\\textwidth}}{{{col_spec}}}")
    latex.append("\\hline")
    
    escaped_headers = [escape_latex(format_inline_styles(h), in_table=True) for h in headers]
    latex.append(" & ".join(escaped_headers) + " \\\\ \\hline")
    
    for row in rows:
        while len(row) < num_cols:
            row.append("")
        row = row[:num_cols]
        escaped_cells = [escape_latex(format_inline_styles(c), in_table=True) for c in row]
        latex.append(" & ".join(escaped_cells) + " \\\\ \\hline")
        
    latex.append("\\end{tabularx}")
    latex.append("\\end{table}")
    return latex

def main():
    print("Converting requirements markdown files to LaTeX...")
    files = sorted([f for f in os.listdir(REQ_DIR) if f.endswith('.md')])
    for file in files:
        filepath = os.path.join(REQ_DIR, file)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        print(f"Converting {file}...")
        latex_content = convert_md_to_latex(content)
        
        match = re.match(r'^REQ-(\d+)', file)
        if match:
            req_num = match.group(1)
            out_filename = f"req{req_num}.tex"
        else:
            out_filename = file.replace('.md', '.tex').lower().replace(' ', '_')
            
        out_filepath = os.path.join(LATEX_REQ_DIR, out_filename)
        with open(out_filepath, 'w', encoding='utf-8') as out_f:
            out_f.write(latex_content)
        print(f"Saved to {out_filepath}")

if __name__ == '__main__':
    main()
