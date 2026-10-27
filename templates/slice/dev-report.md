# <SLICE-ID> — geliştirici raporu

Geliştirici PASS ilan etmez. Bu rapor kanıt değildir; her komut ilk bağımsız temiz koşuda yeniden üretilir. Geçerli bağımsız kanıta sonraki atıflar `method/SLICE_LANE.md` "Evidence validity and reuse" kuralına tabidir; inceleyicinin kendi zorunlu hedefli kontrolleri korunur.

Dal: `<dal>` · Taban: `<taban-sha>` · Aday: `<aday-sha>` · Yalnız-test commit'i: `<test-sha>`
Ortam: worktree `<yol>`, port `<port>`, test DB `<lane DB>`; ana önizlemeye ve paylaşılan DB'ye dokunulmadı.
Kanıt bağları: main `<sha>`, merge-base `<sha>`; test/standart `<sürüm + config/baseline>`; ilgili bağımlılık/lockfile, DB şeması/fixture, toolchain ve ortam `<gizli olmayan sürüm/kimlikler veya gerekçeli uygulanmaz>`.
Tarih / süre: <YYYY-MM-DD>, başlangıç <hh:mm>, bitiş <hh:mm>

## Yapılanlar

- <değişiklik → hangi K maddesi>

## Yapılmayanlar ve bilinen eksikler

- <neden; öneri; backlog adayı>

## Kabul maddeleri → kanıt

| K | Kanıt (test adı / komut) | Sonuç |
|---|---|---|
| K1 | `<…>` | <…> |

## Kırmızı-önce kanıtı

`git checkout <test-sha>` (yalnız testler, ürün kodu yok) üzerinde: `<komut>` → <n> test kırmızı (`<evidence>/red-first.txt`). Aday üzerinde aynı komut yeşil.

## Çalıştırılan komutlar

Her koşu için tek kayıt: komut hücresinde `<kayıt-kimliği>`, gerçek hücresinde sonuç + exit + varsa test sayısı + ham log bağlantısı; çalıştıran geliştiricidir, yukarıdaki aday ve bağlar geçerlidir (fark varsa satırda belirt). K/öz-denetim satırları aynı kayda atıf verebilir; logu kopyalama. NOT_RUN, sıfır test, başarısız/eksik komut test PASS'ı değildir. İlk bağımsız koşunun kaydı ayrıca bağlanır; bu rapor onun yerine geçmez.

| Komut | Beklenen | Gerçek |
|---|---|---|
| `scripts/gate.sh <kendi worktree>` | `GATE PASS` | <son satır> |
| `{{standards_check}}` (kendi worktree) | `STANDARDS PASS` | <son satır> |
| `{{static_analysis}}` | <yeni bulgu yok> | <son satır> |
| `{{boundary_check}}` | <yeni kenar yok> | <son satır> |
| `{{test_command}}` <dilim seçicisi> | OK | <…> |

## Mutasyonlar (uygulandı, geri alındı)

TAM: yeni/değişen kural başına 3–5 mutasyon. HAFİF: davranış değişikliği başına bir mutasyon; yeni/değişen davranış yoksa dilimdeki "uygulanmaz: <neden>" gerekçesini burada yaz; inceleyici doğrular. Uygulanabilir mutasyon atlanmaz.

| M | Bozulan kural | Kırmızı olan test | Kanıt dosyası |
|---|---|---|---|
| M1 | <…> | <…> | `<evidence>/mutations/M1.txt` |

Tarayıcı kanıtı: <senaryo + ekran görüntüleri | dilim UI'a (rota, görünüm/şablon, UI bileşeni) dokunmuyorsa dilimdeki "uygulanmaz: <neden>">; inceleyici doğrular.

## İnceleme öncesi öz-denetim

Kaynak: JKM inceleme öncesi öz-denetimi (`docs/slice-lane/SOURCES.md`; deterministik grep kuralları; FAIL çıkışı 1, WARN yalnız basılır). Yığına özgü kalıplar yığın profilinden gelir (`stacks/<yığın>/checklist-commands.md`). Projenin kendi öz-denetim komutu `slice-method.json` → `selfcheck` alanında; yoksa aşağıdaki satırlar elle doldurulur. FAIL varken inceleme istenmez.

| Kural | Önem | Kontrol (komut) | Sonuç |
|---|---|---|---|
| İş mantığı UI katmanında yok (transaction, mail, toplu atama) | FAIL | `{{standards_check}}` (UI katmanı kuralları) | <…> |
| Çift gönderim koruması (submit/complete eylemlerinde kilit/bayrak) | FAIL | `git grep -n` <proje kalıbı> | <…> |
| Doğrulama kuralı olan her bileşende mesajlar var | FAIL | <proje kalıbı> | <…> |
| Hata kodu çakışması (aynı kod >3 dosyada) | FAIL | <proje kalıbı> | <…> |
| Servis içinde doğrudan sorgu: depoya taşındı ya da gerekçesi yazıldı | WARN | standart kapısı sayaç satırı | <…> |
| Kiracı kapsamı atlatma yeni yerde yok; varsa güvenlik sınırı yazılı | WARN | `git grep -n '<kapsam atlatma kalıbı>'` | <…> |
| Yeni rota adları kayıtlı; yeni görünümler var | FAIL | `templates/review-checklist.md` C1, C8 komutları | <…> |
| İzinli liste dışında dosya yok | FAIL | `git diff --name-only <taban>..HEAD` | <…> |
| Göçün geri alma adımı var ve host tablosunu silmez (ya da neden güvenli olmadığı yazılı) | FAIL | `git grep -n '<geri alma kalıbı>' -- <göç dizini>` | <…> |

## Maliyet

Yöntemin maliyetini ölçmek için (`method/SLICE_LANE.md` "Cost accounting"). Ölçülmeyen alan `ölçülmedi` yazılır, tahmin edilmez. Geliştirici kendi satırlarını doldurur; inceleme, koordinatör ve toplam satırlarını koordinatör kapanıştan önce tamamlar.

- Model: <ad> · Effort: <seviye>  (kullanılan; `method/MODEL_CHOICE.md`)
- Duvar-saati-geliştirme-dk: <n | ölçülmedi>  (geliştiricinin başlangıcı → bu rapor)
- Duvar-saati-dilim-dk: <n | ölçülmedi>  (dilim dosyası → kapanış notu, tüm turlar; koordinatör)
- Token-geliştirici: <giriş>/<çıkış> | ölçülmedi
- Token-inceleme: <giriş>/<çıkış> | ölçülmedi  (inceleme + aynı oturumdaki yeniden inceleme)
- Token-koordinatör: <giriş>/<çıkış> | ölçülmedi
- Token-toplam: <giriş>/<çıkış> | ölçülmedi
- Ölçüm-kaynağı: <istemci kullanım komutu | API kullanım kaydı | günlük>

## ACEF gözlemi

Yöntemin ya da araçların bu dilimde maliyet çıkardığı bir an (≥30 dk kayıp, kural ihlali, sonuç kaybeden araç, etkisiz
kalan hızlandırma, brifte yazılması gereken bir şey yüzünden tur) varsa tek cümle; yoksa `yok`. Koordinatör kapanışta
merkezi günlüğe taşır (`acef-note add`).

- ACEF-gözlem: <tek cümle | yok>

## Bilinmeyenler ve koordinatöre sorular

- <izinli listeyi aşma ihtiyacı (dosya + neden) — geliştirici burada DURUR>
- <doğrulanamayan iddia: neden>
