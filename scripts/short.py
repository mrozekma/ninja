#!/usr/bin/env python3
import fileinput
import os
import sys
import uuid

mapping = {}

if len(sys.argv) > 1:
	mapFile = open(sys.argv[1], 'a+', 1)
	mapFile.seek(0, os.SEEK_SET)
	for line in mapFile.readlines():
		id, rewrite = line.strip().split(' ', 1)
		mapping[id] = rewrite
else:
	mapFile = None

def getNewId():
	rtn = uuid.uuid4().hex[:8]
	return rtn if rtn not in mapping else getNewId()

def getIdFromUri(uri):
	return uri.split('/')[-1]

for line in fileinput.input(['-']):
	cmd, arg = line.strip().split(' ', 1)
	if cmd == 'new':
		id = getNewId()
		mapping[id] = arg
		if mapFile:
			mapFile.write("%s %s\n" % (id, arg))
		print(id, flush = True)
	elif cmd == 'get' and getIdFromUri(arg) in mapping:
		print(mapping[getIdFromUri(arg)], flush = True)
	else:
		print('NULL', flush = True)
