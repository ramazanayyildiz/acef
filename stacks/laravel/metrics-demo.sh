#!/bin/bash
# metrics-demo.sh — regenerate archive/slice-lane/metrics-2026-10-19.md (a provenance record) from the demo inputs.
# Run with NO env vars to reproduce the committed document: the inputs are read from metrics-paths.json next to this
# file (the "metrics path config" of this adapter); env REBUILD, PLATFORM, SESSION_SLICES (set to "" to skip), OUT,
# PIN_REBUILD, PIN_PLATFORM override them.
# Pinned inputs: backlogs are read from the pinned commits (git show), so later backlog commits do not change the output.
# Slice files and reviews are read from the working tree (metrics.py also reads their git history); if <repo>/docs/slices
# differs from the pin, a WARNING goes to stderr and the output may differ from the committed document.
# The session section reads the coordinator's scratchpad (git-less, not pinnable): it is a snapshot; if that directory
# is gone the section is left out and a WARNING is printed.
set -u
STACK=$(cd "$(dirname "$0")" && pwd -P)       # stacks/laravel
HERE=$(cd "$STACK/../.." && pwd -P)           # acef repo root
cfg() { python3 -I -c 'import json,sys; print(json.load(open(sys.argv[1], encoding="utf-8"))[sys.argv[2]])' "$STACK/metrics-paths.json" "$1"; }
R=${REBUILD:-$(cfg rebuild)}
P=${PLATFORM:-$(cfg platform)}
S=${SESSION_SLICES-$(cfg session_slices)}
PR=${PIN_REBUILD:-$(cfg pin_rebuild)}
PP=${PIN_PLATFORM:-$(cfg pin_platform)}
OUT=${OUT:-$HERE/$(cfg out)}
M="python3 -I $HERE/scripts/slice/metrics.py --profile $STACK/profile.json"
[ -d "$R/docs/slices" ] || { echo "rebuild slices not found: $R/docs/slices" >&2; exit 2; }
[ -d "$P/docs/slices" ] || { echo "platform slices not found: $P/docs/slices" >&2; exit 2; }
RS=$(git -C "$R" rev-parse --short=9 "$PR") || exit 2; PS=$(git -C "$P" rev-parse --short=9 "$PP") || exit 2
TMPB=$(mktemp -d "${TMPDIR:-/tmp}/metrics-demo.XXXXXX"); trap 'rm -rf "$TMPB"' EXIT
git -C "$R" show "$PR:observations/backlog.md" >"$TMPB/rebuild-backlog.md" || exit 2
git -C "$P" show "$PP:docs/backlog.md" >"$TMPB/platform-backlog.md" || exit 2
git -C "$R" diff --quiet "$PR" -- docs/slices || echo "WARNING: $R/docs/slices differs from pin $RS; output may differ from the committed document" >&2
git -C "$P" diff --quiet "$PP" -- docs/slices || echo "WARNING: $P/docs/slices differs from pin $PS; output may differ from the committed document" >&2
if [ -n "$S" ] && [ ! -d "$S" ]; then echo "WARNING: session slices dir not found ($S); session section left out" >&2; S=""; fi
set -e
{
cat <<EOF
# Ölçüm demosu — 2026-10-19

\`scripts/slice/metrics.py\` iki demo girdisinde (rebuild ve platform) ve ek olarak koordinatör oturumunun git dışı dilim dosyalarında koşturuldu. Aşağıdaki sayılar betiğin çıktısıdır; elle düzeltilmedi. Okunamayan ya da kaynağı olmayan değer "doğrulanmadı"dır. Yeniden üretmek: \`stacks/laravel/metrics-demo.sh\` (ortam değişkeni gerekmez).

Kaynak commit'ler (sabitlenmiş): rebuild \`$RS\`, platform \`$PS\`; backlog'lar bu commit'lerden okunur, dilim dizinleri bu commit'lerle aynı değilse betik uyarır. Oturum bölümü koordinatörün scratchpad'inden (\`SESSION_SLICES\`, varsayılan yol betikte) okunur; git dışıdır, sabitlenemez, belge üretildiği anın görüntüsüdür.

## Nasıl okunur (sınırlar)

- **İnceleme raporu ≠ tur.** Rebuild TAM dilimlerinde aynı turda Codex ve Opus ayrı rapor yazdı; rapor sayısı tur sayısından büyüktür. "İlk karar" kronolojik ilk rapordur (git ekleme zamanı, sonra addaki tur numarası); aynı turda iki rapor varsa biri seçilir. Bu yüzden "ilk incelemede PASS" oranı rebuild için yaklaşıktır.
- **Süreler git commit damgası vekilidir, oturum süresi değildir.** Geliştirme = dilim dosyasının ilk eklenmesi → dev raporunun ilk eklenmesi; inceleme = dev raporu → son inceleme raporu. İki dosya aynı commit'te geldiyse ya da sıra tersse "doğrulanmadı". Platformda dilim dosyası geliştiricinin dalında commit'lendiği için geliştirme vekili yalnız geliştiricinin commit aralığıdır.
- **Kaçan hata:** hiçbir kapanış notunda \`Kaçan-hata:\` alanı yok, bu yüzden doğrulanmadı. "Aday" backlog maddesi metninde "kaçırdı / missed / escaped" ile dilim kimliğinin eşleşmesidir; insan teyidi ister.
- **Kapanış notu:** rebuild'de 25 dilim dosyasında (+ \`_template.md\`) kapanış başlığı var ama çoğu doldurulmamış yer tutucu ("koordinatör doldurur"); betik yalnız karar ya da KAPANDI içerenleri sayar. Rebuild kapanışı fiilen HANDOFF.md ve merge commit'lerinde tutuyor.
- **"Durum satırı"** dosyadaki ilk \`Durum:\` satırıdır; kapanışta güncellenmediği için çoğu dilimde eskimiştir (platformda hepsi "GELİŞTİRMEDE" yazar ama kapanış notu PASS der). Bu bir yöntem bulgusudur.

## Özet

EOF
$M "$R/docs/slices" --backlog "$TMPB/rebuild-backlog.md" --label "rebuild (b2press-rebuild docs/slices)" --summary-only
echo
$M "$P/docs/slices" --backlog "$TMPB/platform-backlog.md" --label "platform (docs/slices)" --summary-only
if [ -n "$S" ] && [ -d "$S" ]; then
    echo
    $M --no-git "$S" --backlog "$TMPB/platform-backlog.md" --label "oturum (scratchpad, git dışı)" --summary-only
fi
echo
echo "## Dilim tabloları"
echo
$M "$P/docs/slices" --backlog "$TMPB/platform-backlog.md" --label "platform"
if [ -n "$S" ] && [ -d "$S" ]; then
    echo
    $M --no-git "$S" --backlog "$TMPB/platform-backlog.md" --label "oturum (scratchpad, git dışı)"
fi
echo
$M "$R/docs/slices" --backlog "$TMPB/rebuild-backlog.md" --label "rebuild"
} >"$OUT"
echo "wrote $OUT"
