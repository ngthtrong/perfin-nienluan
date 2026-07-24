ENGINE := xelatex
FLAGS := -interaction=nonstopmode -halt-on-error -file-line-error
MAIN := main

# Nguồn dùng chung, không phụ thuộc ngôn ngữ.
COMMON := $(MAIN).tex config/preamble.tex

# Nguồn theo ngôn ngữ.
SRC_VI := config/lang-vi.tex metadata-vi.tex \
  frontmatter/vi/cover.tex frontmatter/vi/abstract.tex frontmatter/vi/abbreviations.tex \
  chapters/vi/chapter1.tex chapters/vi/chapter2.tex chapters/vi/chapter3.tex \
  chapters/vi/chapter4.tex chapters/vi/references.tex chapters/vi/appendices.tex
SRC_EN := config/lang-en.tex metadata-en.tex \
  frontmatter/en/cover.tex frontmatter/en/abstract.tex frontmatter/en/abbreviations.tex \
  chapters/en/chapter1.tex chapters/en/chapter2.tex chapters/en/chapter3.tex \
  chapters/en/chapter4.tex chapters/en/references.tex chapters/en/appendices.tex

.PHONY: all vi en clean

all: vi en

vi: $(MAIN)-vi.pdf
en: $(MAIN)-en.pdf

# -jobname đặt tên PDF/aux riêng để hai ngôn ngữ không ghi đè lẫn nhau.
$(MAIN)-vi.pdf: $(COMMON) $(SRC_VI)
	$(ENGINE) $(FLAGS) -jobname=$(MAIN)-vi "\def\doclang{vi}\input{$(MAIN).tex}"
	$(ENGINE) $(FLAGS) -jobname=$(MAIN)-vi "\def\doclang{vi}\input{$(MAIN).tex}"
	$(ENGINE) $(FLAGS) -jobname=$(MAIN)-vi "\def\doclang{vi}\input{$(MAIN).tex}"

$(MAIN)-en.pdf: $(COMMON) $(SRC_EN)
	$(ENGINE) $(FLAGS) -jobname=$(MAIN)-en "\def\doclang{en}\input{$(MAIN).tex}"
	$(ENGINE) $(FLAGS) -jobname=$(MAIN)-en "\def\doclang{en}\input{$(MAIN).tex}"
	$(ENGINE) $(FLAGS) -jobname=$(MAIN)-en "\def\doclang{en}\input{$(MAIN).tex}"

clean:
	$(RM) $(MAIN)-vi.aux $(MAIN)-vi.log $(MAIN)-vi.out $(MAIN)-vi.toc \
	  $(MAIN)-vi.lof $(MAIN)-vi.lot $(MAIN)-vi.fls $(MAIN)-vi.fdb_latexmk $(MAIN)-vi.synctex.gz \
	  $(MAIN)-en.aux $(MAIN)-en.log $(MAIN)-en.out $(MAIN)-en.toc \
	  $(MAIN)-en.lof $(MAIN)-en.lot $(MAIN)-en.fls $(MAIN)-en.fdb_latexmk $(MAIN)-en.synctex.gz \
	  $(MAIN).aux $(MAIN).log $(MAIN).out $(MAIN).toc \
	  $(MAIN).lof $(MAIN).lot $(MAIN).fls $(MAIN).fdb_latexmk $(MAIN).synctex.gz
