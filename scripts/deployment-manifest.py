import pathlib,json,hashlib
root=pathlib.Path(__file__).resolve().parents[1]
files=[]
for p in sorted(root.rglob('*')):
 rel=p.relative_to(root)
 if not p.is_file() or any(x in ('node_modules','.next','.git','.vercel') for x in rel.parts) or str(rel).startswith('.env') or p.name in ('.bootstrap-secrets.json','.test-state.json') or p.suffix=='.tsbuildinfo': continue
 data=p.read_bytes();files.append({'file':str(rel),'sha':hashlib.sha1(data).hexdigest(),'size':len(data)})
print(json.dumps(files))
