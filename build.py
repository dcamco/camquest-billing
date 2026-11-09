import sys, pathlib
anim = pathlib.Path('/home/claude/anim.js').read_text()
for src, dst in [('/home/claude/landing.html','/home/claude/camquest-billing/index.html'),
                 ('/home/claude/camquest-mockup.html','/home/claude/camquest-billing/mockup/index.html'),
                 ('/home/claude/possibilities.html','/home/claude/camquest-billing/possibilities/index.html'),
                 ('/home/claude/presentation.html','/home/claude/camquest-billing/presentation/index.html')]:
    p = pathlib.Path(src)
    if not p.exists(): continue
    out = p.read_text().replace('<!--ANIM-->', '<script>\n' + anim + '\n</script>')
    d = pathlib.Path(dst); d.parent.mkdir(parents=True, exist_ok=True); d.write_text(out); print('built', dst, len(out))
