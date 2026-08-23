LIBFILES=$(wildcard src/*.ts)
TSFILES=$(wildcard *.ts)
ENTRIES=$(subst .ts,.js,$(TSFILES))

.PHONY: all
all: $(ENTRIES)

index.node.js: index.node.ts $(LIBFILES)
	npx esbuild@0.28.2 $< --bundle --outfile=$@ --platform=node --format=cjs

%.node.js: %.node.ts $(LIBFILES)
	npx esbuild@0.28.2 $< --bundle --external:./ --outfile=$@ --platform=node
	sed -i.bak 's/ts-node/node/g' $@ && rm -f $@.bak

%.js: %.ts $(LIBFILES)
	npx esbuild@0.28.2 $< --bundle --outfile=$@ --platform=browser --format=iife --global-name=$* --target=es2015

.PHONY: clean
clean:
	rm $(ENTRIES)
