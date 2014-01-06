TEST_SRCS=$(shell ls *_test.js)
TEST_HTML=$(TEST_SRCS:.js=.html)

%.html: %.js
	python /home/birkbeck/src/closure/closure/bin/calcdeps.py --dep ../closure \
	--path ../third_party --path ../library --output_mode deps --path ../closure -i $< \
	--output_file $(basename $<)-deps.js
	$(shell ../gen_test.sh $(basename $<) > $@)

test_files: ${TEST_HTML}
