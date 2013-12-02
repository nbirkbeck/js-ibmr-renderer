SRC=$(shell ls library/*.js library/ui/*.js) binary/main.js 

renderer.js: ${SRC}
	python /home/birkbeck/src/closure/closure/bin/build/closurebuilder.py -c /home/birkbeck/src/closure/compiler.jar \
	-f --create_source_map=renderer.js.map  -f --source_map_format=V3 \
	 --root /home/birkbeck/src/closure/closure --root /home/birkbeck/src/closure/third_party/closure -n vis.YxvFileReader -n vis.PcaMesh \
	${SRC} -i binary/main.js -o compiled -f --compilation_level=SIMPLE_OPTIMIZATIONS -f --externs=externs/three.js \
	-f --externs=externs/jquery-1.9.js --output_file=renderer.js
