# Keşif turu brief'i — <GRUP/FAZ>-EXPLORE-<n>

Betikler önceden yazılmış yolları doğrular; insanın takıldığı yerleri (anlaşılmayan metin, kopuk akış, mobil düzen, çelişen ekran) bulmaz. Keşif turu bunun içindir. **Ne zaman:** her plan grubu / faz kapanışında ve canlı öncesi. Engelleyici bulgusu açık grup kapanmış sayılmaz.

Grubun hiçbir dilimi UI'a (rota, görünüm/şablon, UI bileşeni) dokunmuyorsa — sınıfı ne olursa olsun — tarayıcı turu "uygulanmaz: <neden>" olarak kaydedilir; inceleyici gerekçeyi doğrular (`method/SLICE_LANE.md` "Applicability"). Uygulanabilir tur ve TAM şartları korunur.

- **Kim:** farklı model ailesi (ör. Codex `<model>`), ayrı test worktree'si, sentetik veri, kendi port.
- **Erişim:** yalnız `127.0.0.1:<app-port>` ve `127.0.0.1:<cdp-port>`; yazma yalnız `<evidence>/<ID>-EXPLORE-<n>/` ve `.tmp/`. Kod, test, git ve uygulama komutlarıyla veri değişmez.
- **Tarayıcı:** koordinatör başsız Chrome'u sandbox dışında başlatır (`--headless=new --remote-debugging-port=<cdp-port> --user-data-dir=<worktree>/.tmp/chrome-profile`); ajan `connectOverCDP` ile bağlanır, uygulama dışı istekleri engeller. Tur bitince Chrome kapatılır.
- **Kapsam:** personalar <yönetici, üye, yetkisiz kullanıcı, devre dışı kullanıcı, başka kiracı>; grubun uçtan uca görevleri; mutlu yol dışı (geri, çift tık, boş gönderim, uzun metin, yenileme); 1280×800 ve 390×844; her adımda ekran görüntüsüne bakıp sonraki adıma kendisi karar verir.
- **Çıktı:** `report.md`, ilk satır `FINDINGS: <n>`; tablo `id | önem | persona | genişlik | yer | adımlar | beklenen | gerçek | ekran görüntüsü`; ayrıca "Worked well" ve "Not reached".
- **Kullanıcı hedefi turu ayrıdır:** bir profilin gerçek işini bitirip bitiremediğini, kod ve çözüm adımı verilmeden ölçen tur `user-goal-tour.md`'dedir. Bu rol turu olduğu gibi sürer; biri diğerinin yerini tutmaz.
- **Sonra:** koordinatör worktree'nin `git status`'unu doğrular (yalnız kanıt klasörü), raporu ve görüntüleri alır, bulguları FIX dilimlerine çevirir.
