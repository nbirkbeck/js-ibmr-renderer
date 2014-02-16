#!/bin/bash
name=$1
cat << EOF
<html>
<head>	
  <title>Test for ${name}</title>
</head>
<body>
  <script src="http://cdnjs.cloudflare.com/ajax/libs/three.js/r61/three.js"> </script>
  <script src="../closure/goog/base.js"></script>
  <script src="${name}-deps.js"></script>
  <script src="${name}.js"></script>
</body>

<script>
var asyncTestCase;
try {
  asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(document.title);
} catch (error) {
}
</script>
</html>
EOF
