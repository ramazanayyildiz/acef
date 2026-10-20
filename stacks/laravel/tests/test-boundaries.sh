#!/bin/bash
# Self-test for check-module-boundaries.php with a non-default namespace: baseline edge passes, a new edge fails.
set -u
HERE=$(cd "$(dirname "$0")/.." && pwd -P)
T=$(mktemp -d "${TMPDIR:-/tmp}/sm-mb.XXXXXX"); trap 'rm -rf "$T"' EXIT
ok=0; bad=0
check() { if [ "$1" = "$2" ]; then echo "ok   $3"; ok=$((ok+1)); else echo "FAIL $3 (got $1, want $2)"; bad=$((bad+1)); fi; }
mkdir -p "$T/mods/Core" "$T/mods/Shop" "$T/mods/Blog"
printf '<?php\nnamespace Acme\\Mods\\Core;\nclass Clock {}\n' > "$T/mods/Core/Clock.php"
printf '<?php\nnamespace Acme\\Mods\\Shop;\nuse Acme\\Mods\\Core\\Clock;\nclass Cart { public function __construct(private Clock $c) {} }\n' > "$T/mods/Shop/Cart.php"
printf '<?php\nnamespace Acme\\Mods\\Blog;\nclass Post {}\n' > "$T/mods/Blog/Post.php"
php "$HERE/check-module-boundaries.php" --namespace='Acme\Mods' --modules-dir="$T/mods" --baseline="$T/b.json" --update-baseline >/dev/null 2>&1
check "$?" 0 "--update-baseline writes a baseline"
php "$HERE/check-module-boundaries.php" --namespace='Acme\Mods' --modules-dir="$T/mods" --baseline="$T/b.json" >/dev/null 2>&1
check "$?" 0 "baseline edge Shop>Core passes"
printf '<?php\nnamespace Acme\\Mods\\Blog;\nclass Post { public function f() { return new \\Acme\\Mods\\Shop\\Cart(new \\Acme\\Mods\\Core\\Clock()); } }\n' > "$T/mods/Blog/Post.php"
php "$HERE/check-module-boundaries.php" --namespace='Acme\Mods' --modules-dir="$T/mods" --baseline="$T/b.json" >/dev/null 2>&1
check "$?" 1 "new edges Blog>Shop, Blog>Core fail"
php "$HERE/check-module-boundaries.php" --namespace='bad name' >/dev/null 2>&1
check "$?" 2 "invalid namespace is a usage error"
echo "test-boundaries: ok=$ok fail=$bad"; [ "$bad" -eq 0 ]
