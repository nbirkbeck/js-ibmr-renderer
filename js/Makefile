SRC=library/multipletexturesrenderer.js library/pcamesh.js library/reader.js \
	library/renderer.js library/bigtexturerenderer.js library/types.js \
	library/main.js binary/main.js 

renderer.js: ${SRC}
	python /home/birkbeck/src/closure/closure/bin/build/closurebuilder.py -c /home/birkbeck/src/closure/compiler.jar \
	 --root /home/birkbeck/src/closure/closure --root /home/birkbeck/src/closure/third_party/closure -n YxvFileReader -n PcaMesh \
	${SRC} -i binary/main.js -o compiled -f --compilation_level=SIMPLE_OPTIMIZATIONS -f --externs=externs/three.js --output_file=renderer.js
