SRC=pcamesh.js reader.js main.js binary.js

output.js: ${SRC}
	python /home/birkbeck/src/closure/closure/bin/build/closurebuilder.py -c /home/birkbeck/src/closure/compiler.jar \
	 --root /home/birkbeck/src/closure/closure --root /home/birkbeck/src/closure/third_party/closure -n YxvFileReader -n PcaMesh \
	${SRC} -i binary.js -o compiled -f --compilation_level=SIMPLE_OPTIMIZATIONS -f --externs=threejs-exports.js --output_file=output.js
