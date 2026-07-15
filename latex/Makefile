ENGINE := xelatex
FLAGS := -interaction=nonstopmode -halt-on-error -file-line-error
MAIN := main

.PHONY: all clean

all: $(MAIN).pdf

$(MAIN).pdf: $(MAIN).tex metadata.tex config/preamble.tex \
  frontmatter/cover.tex frontmatter/abstract.tex frontmatter/abbreviations.tex \
  chapters/chapter1.tex chapters/chapter2.tex chapters/chapter3.tex \
  chapters/chapter4.tex chapters/references.tex chapters/appendices.tex
	$(ENGINE) $(FLAGS) $(MAIN).tex
	$(ENGINE) $(FLAGS) $(MAIN).tex
	$(ENGINE) $(FLAGS) $(MAIN).tex

clean:
	$(RM) $(MAIN).aux $(MAIN).log $(MAIN).out $(MAIN).toc \
	  $(MAIN).lof $(MAIN).lot $(MAIN).fls $(MAIN).fdb_latexmk \
	  $(MAIN).synctex.gz
