SRC=$(shell ls library/*.js library/ui/*.js) binary/main.js 

renderer.js: ${SRC}
	python ${CLOSURE}/closure/bin/build/closurebuilder.py -c ${CLOSURE}/compiler.jar \
	-f --create_source_map=renderer.js.map  -f --source_map_format=V3 \
	 --root ${CLOSURE}/closure --root ${CLOSURE}/third_party/closure -n vis.YxvFileReader -n vis.PcaMesh \
	${SRC} -i binary/main.js -o compiled -f --compilation_level=WHITESPACE_ONLY -f --externs=externs/three.js \
	-f --externs=externs/jquery-1.9.js --output_file=renderer.js
	echo "//# sourceMappingURL=renderer.js.map" >> renderer.js

clean:
	rm -fv library/*-deps.js library/*_test.html
