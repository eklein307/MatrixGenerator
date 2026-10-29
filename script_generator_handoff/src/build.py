import sys
src = open('/home/claude/src/script_generator.src.html').read()
lib = open(sys.argv[1]).read()
assert '</script' not in lib.lower(), 'lib contains closing script tag'
out = src.replace('/*SHEETJS*/', lib, 1)
open('/home/claude/out/script_generator.html','w').write(out)
print(len(out))
