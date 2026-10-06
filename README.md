# Hành tinh cỏ

Game Three.js cho team cùng khám phá một hành tinh. WASD hoặc mũi tên để đi, E để ăn cỏ, Space để nhảy, F để húc, cuộn chuột để nhìn gần.

## Chạy để phát triển

Mở terminal trong `D:\MyProject`, chạy `npm install` rồi `npm run dev`. Máy chủ mở cổng 5173 trên mạng LAN.

## Chạy cho team

Chạy `npm run play`. Lệnh này build game và chạy máy chủ Node có WebSocket. Bạn bè cùng mạng mở link LAN được in trong terminal. Nút **Mời team** cũng sao chép link này. Khi máy chủ dev đang chạy, cần dừng nó trước vì cả hai dùng cổng 5173.

Mỗi tab là một con bò. Nhập tên trong Menu → Cài đặt. Vị trí, động tác ăn và cỏ được đồng bộ trong một phòng chung. Hai người ăn cùng cụm cỏ thì chỉ người được máy chủ xác nhận trước nhận XP.

Bò mới bắt đầu ở cấp 1, XP 0, kỹ năng 0. Qua vòng mới, người còn sống giữ cấp, XP, điểm kỹ năng và kỹ năng đã nâng. Chỉ khi bị húc về 0 máu mới reset về cấp 1. Một cụm cỏ cho 1 XP trước các thưởng XP. Cấp 1 cần 180 XP để lên cấp 2; mỗi cấp sau cần thêm 120 XP (300, 420, 540...). Nâng Ăn rộng thu được nhiều cỏ và nhiều XP hơn khi còn đủ cỏ. Có 4 kỹ năng: Ăn rộng, Húc mạnh, Trụ vững, Bền sức. Mỗi kỹ năng tối đa 5 bậc, cấp chiến đấu tối đa 21. Điểm và thưởng chỉ số giữ cho đến khi bị húc chết.

Mỗi vòng có 30 giây ăn cỏ và chọn kỹ năng, sau đó 60 giây combat. Trong lúc ăn cỏ chưa được húc. Khi combat bắt đầu, cấp và kỹ năng được khóa; ăn cỏ chỉ hồi máu, không nhận XP. Máy chủ giữ cùng đồng hồ cho cả team.

Người mới vào giữa combat sẽ chờ vòng ăn cỏ tiếp theo, không được ăn cỏ, nhảy, húc hoặc bị húc trong lúc chờ. Người kết nối lại vẫn trở về đúng bò và trạng thái trước đó. Khi đang chờ hoặc hết máu, chọn tên trong mục **Xem bò** để camera theo dõi người còn sống. Đầu vòng mới, người đang chờ được đưa vào chơi. Người đã bị húc chết bắt đầu lại ở cấp 1; người còn sống giữ sức mạnh. Người xem chưa tham gia sẽ không có điểm trong kết quả combat đang chạy.

## Hai đội, biểu cảm và âm thanh

Mặc định phòng chơi chế độ **2 đội**: **Xanh** và **Đỏ**, cho cả team tham gia. Mục **Chế độ chơi** nằm trong **Menu → Cài đặt**; chủ phòng chọn **2 đội / Tự do** khi đang ăn cỏ. Mỗi người có hai nút **Đội Xanh / Đội Đỏ** để tự chọn hoặc chuyển đội trong giai đoạn này. Đang combat khóa chuyển đội để điểm vòng hợp lý. Máy chủ chọn đội ít người hơn khi mới vào; sau đó giữ đội đã chọn qua các vòng, không tự cân lại hoặc giới hạn số người mỗi đội. Chuyển đội đưa bò về vị trí đội mới, giữ XP, kỹ năng, máu, stamina và skin. Mỗi lần chuyển cách nhau ít nhất 1 giây.

Vòng cổ, viền bảng tên, danh sách phòng và nút chọn đội thể hiện màu Xanh/Đỏ. Đội độc lập với skin: skin Dâu có thể ở đội Xanh và skin Matcha có thể ở đội Đỏ. Hai đội có vị trí bắt đầu riêng. Không gây sát thương hoặc đẩy đồng đội; húc hụt vẫn tốn stamina.

Điểm đội là tổng số bò hạ và sát thương thực tế của các thành viên. Hết combat, đội có nhiều điểm hạ hơn thắng, bằng điểm hạ thì xét sát thương; bằng cả hai thì hòa. Vòng không có sát thương chưa công bố người thắng. Kết quả có cả điểm đội và điểm từng người. Chủ phòng (người kết nối đầu tiên còn trong phòng) có thể chọn **2 đội / Tự do** trong mục Chế độ khi đang ăn cỏ; combat khóa lựa chọn. Đổi chế độ giữ XP, kỹ năng và đưa bò về vị trí bắt đầu. Chủ phòng mất kết nối thì quyền chọn chuyển cho người còn trong phòng.

Phím **1** thả tim, **2** vui vẻ, **3** kêu Moo; có nút tương ứng dưới nút ăn cỏ. Biểu cảm hiện cạnh đầu bò và thay đổi mắt, tai, động tác đầu; đồng bộ cho cả phòng. Mỗi biểu cảm tồn tại 2,5 giây và cần chờ 2,5 giây trước lần tiếp theo. Không tốn stamina, không ảnh hưởng sát thương. Người đang xem hoặc hết máu không gửi biểu cảm.

Âm thanh gồm ăn cỏ, nhảy, húc, trúng đòn, lên cấp, bắt đầu combat, thắng vòng và biểu cảm. Kêu Moo được tạo bằng Web Audio, không tải file âm thanh từ mạng. Biểu cảm của bò ở gần có âm nhỏ dần theo khoảng cách. Âm bắt đầu sau thao tác đầu tiên trong trang; mở **Menu → Cài đặt** để bật/tắt và chỉnh âm lượng. Cài đặt lưu trên trình duyệt. Tab ẩn dừng phát âm, số giọng đồng thời giới hạn 20.

## Điểm vòng và kết nối lại

Hạ một bò về 0 máu nhận 1 điểm hạ. Sát thương chỉ tính lượng máu thực sự trừ, kể cả khi đòn cuối mạnh hơn máu còn lại. Ở chế độ Tự do, hết 60 giây combat, xếp theo số bò hạ rồi sát thương. Bằng cả hai thì đồng hạng. Vòng chưa có sát thương không công bố người thắng. Người đã rời phòng vẫn có tên trong kết quả vòng đó. Điểm reset đầu vòng mới.

Mở **Điểm vòng** để xem điểm hiện tại. Kết quả cuối vòng hiện trong bảng nhỏ, tự đóng sau 20 giây và không chặn chơi. Nút **Kết quả vòng trước** mở lại bảng. Thông báo lên cấp tự ẩn sau 6 giây (10 giây nếu có skin), không dừng ăn cỏ, di chuyển hay đồng hồ.

Máy chủ giữ chú bò 5 phút sau khi mất kết nối. Tải lại cùng tab hoặc kết nối lại sẽ giữ ID, vị trí, máu, kỹ năng chiến đấu và điểm. Stamina vẫn hồi theo thời gian; bò mất mạng vẫn ở trong thế giới và có thể bị húc. Vòng vẫn tiếp tục. Nếu bò bị húc chết trong lúc mất mạng, cấp và kỹ năng cũng reset khi kết nối lại. Mỗi tab giữ mã kết nối trong sessionStorage. Đóng tab rồi mở một tab mới có thể tạo bò mới. Khởi động lại máy chủ hoặc quá thời hạn lưu sẽ mất trạng thái trận; skin vẫn lưu trên trình duyệt.

## Cấp sưu tầm và tủ skin 3D

Cấp chiến đấu chỉ reset khi bị húc chết. Cấp sưu tầm giữ qua các vòng: XP nhận từ ăn cỏ trong giai đoạn chuẩn bị đồng thời cộng vào tổng XP sưu tầm. Cấp sưu tầm dùng cùng đường XP 180, 300, 420... nhưng không tăng sức mạnh chiến đấu. Trong combat không nhận XP cho cả hai loại cấp.

Skin mở ở các mốc cấp sưu tầm: Bò dâu 3, Chocolate 5, Matcha 7, Mây 9, Oải hương 11, Hoàng gia 13. Tổng XP cần tương ứng là 480, 1.440, 2.880, 4.800, 7.200, 10.080; có thể kiếm qua nhiều vòng. Skin đã nhận giữ vĩnh viễn trên trình duyệt, chỉ thông báo lần đầu. Dữ liệu cũ giữ nguyên skin; tổng XP sưu tầm ban đầu dùng mức XP tối thiểu tương ứng kỷ lục cấp cũ, vì bản cũ chưa lưu tổng qua các vòng.

Mở **Tủ skin**, bấm **Xem** để ngắm mô hình 3D kể cả khi chưa mở skin. Kéo thanh **Xoay bò** để xem mọi góc. Nút mặc chỉ bật khi đã nhận skin. Mô hình xem trước dùng chung mã tạo bò với game. Canvas xem trước chỉ khởi tạo khi mở tủ, chỉ vẽ lại khi chọn skin, xoay hoặc đổi kích thước. Skin đổi màu và phụ kiện, không tăng chỉ số, ngoại hình được đồng bộ với người trong phòng.

Mỗi bò có 100 máu và 100 stamina cơ bản. Ăn cỏ hồi khoảng 0,4 máu mỗi cụm, không vượt máu tối đa. Húc chỉ được dùng trong combat, đẩy bò đối phương bay đi và gây 12 sát thương cơ bản. Hết máu thì mất cấp và kỹ năng, rồi chờ vòng mới. Húc tốn 25 stamina và hồi đòn sau 0,65 giây. Nhảy tốn 10 stamina. Stamina hồi 10 điểm/giây sau khi nghỉ dùng đòn hoặc nhảy 1 giây. Húc mạnh tăng lực đẩy và sát thương; Trụ vững giảm cả hai; Bền sức tăng 20 stamina tối đa mỗi bậc.

Máy chủ quyết định đồng hồ vòng, lượng cỏ được ăn, máu hồi, stamina và đường bay khi bị húc. Đầu vòng mới, vị trí bò, đồng cỏ, máu, stamina và điểm vòng được đặt lại. Người còn sống giữ cấp, XP và kỹ năng. Tin vị trí của vòng cũ bị bỏ qua để không ghi đè vị trí mới. Tải lại trang trong cùng phòng/vòng giữ XP và lựa chọn kỹ năng đã lưu; một phiên phòng mới dùng cấp và kỹ năng đã lưu trên máy. Skin và kỷ lục cấp vẫn giữ.

Trạng thái đồng cỏ của phòng giữ trong bộ nhớ máy chủ và được tạo lại khi khởi động máy chủ. Khi bật Supabase, phòng online dùng Realtime và tài khoản lưu trong Postgres. Bản LAN vẫn chạy được trên máy cá nhân. Trang GitHub Pages chưa nối Supabase sẽ chơi một mình.

## Đồ họa

Khung cảnh ban ngày có mây, hoa nhỏ, nấm, đá và viền khí quyển. Cỏ có màu ở gốc/ngọn và đung đưa bằng shader. Bò có mắt, má, chuông và bóng tiếp xúc. Hiệu ứng ăn, nhảy, húc được dùng lại trong một pool giới hạn 128 hạt để giữ nhẹ. Giao diện dùng font hệ thống, bảng kỹ năng có thể mở khi cần. Các chuyển động trang trí giảm khi trình duyệt bật tùy chọn giảm chuyển động.


## Menu và luật né húc

Bấm **Menu** hoặc **Esc** để mở/đóng menu riêng. Có bốn mục: **Cài đặt** (tên, âm thanh, chế độ và đội), **Hướng dẫn**, **Nâng cấp** (kỹ năng, tủ skin), **Phòng chơi** (Top hạ bò, thành viên, link mời, điểm và kết quả vòng). Chữ được tăng cỡ và độ tương phản. Màn hình chính giữ đồng hồ, điểm đội, máu/stamina/XP và nút nhanh. Thông báo hành động tự ẩn sau 3 giây. Nút **Nâng cấp** mở hoặc thu gọn bảng nâng nhanh trên màn hình chơi. Menu → Nâng cấp vẫn có thông tin đầy đủ. Khi mở menu, bò ngừng nhận thao tác đi, ăn và húc; đồng hồ vòng vẫn chạy và bò vẫn có thể bị đối thủ húc.

Mỗi vòng **30 giây ăn cỏ → 60 giây combat**. Máy chủ dùng luật chung trong `src/game-rules.js`. Húc trúng gây choáng và văng trong **500 ms**; thời gian này không được đi, nhảy, húc hay ăn cỏ hồi máu. Hết 500 ms máy chủ đưa bò về đúng điểm tiếp đất và cho điều khiển lại. Đường văng tính theo thời gian tuyệt đối, không phụ thuộc số lần nhận cập nhật.

Nhảy được máy chủ xác nhận, tốn 10 stamina và kéo dài khoảng **0,9 giây**. Trong toàn bộ thời gian nhảy, bò được loại khỏi danh sách trúng húc, kể cả lúc mới bật lên. Tiếp đất thì có thể bị húc lại. Không ăn cỏ trong lúc nhảy. Máy chủ tự tính độ cao, không dùng độ cao client gửi để quyết định né húc. Kết nối lại giữ thời điểm nhảy/choáng; vòng mới reset cả hai.
## Top hạ bò và cảnh báo máu yếu

Nút **🏆 Top** trên màn hình mở thẳng bảng trong **Menu → Phòng chơi**. Hiện tối đa 10 người, gồm số hạ, số lần chết và tổng sát thương thực tế. Xếp theo số hạ; bằng nhau xét sát thương; bằng cả hai thì đồng hạng. Điểm cộng dồn qua các vòng, không mất khi chết. Điểm vòng vẫn tính riêng để tìm đội thắng từng vòng.

Máy chủ ghi nhận điểm khi húc thật sự gây sát thương. Bảng cập nhật cho cả phòng. Người rời phòng vẫn giữ tên và điểm trong Top; kết nối lại trong 5 phút tiếp tục dùng cùng bò. Phòng bắt đầu lại sau khi hết phiên lưu, hoặc máy chủ khởi động lại, sẽ làm mới Top. Bảng này chưa lưu vào cơ sở dữ liệu.

Khi máu còn **30% trở xuống**, viền đỏ quanh màn hình nhấp nháy nhẹ. Hồi máu vượt 30%, hết máu hoặc vào chế độ xem thì viền tắt. Người bật tùy chọn giảm chuyển động trên thiết bị sẽ thấy viền đỏ tĩnh.
## Nâng kỹ năng nhanh

Bảng nhỏ ở cạnh phải màn hình hiện 4 kỹ năng, số bậc và điểm còn lại. Bấm nút có dấu **+** để dùng 1 điểm, không cần mở menu. Bảng tự mở khi vào giai đoạn ăn cỏ hoặc vừa nhận thêm điểm; vào combat tự thu gọn. Bấm tiêu đề **Kỹ năng** hoặc nút **Nâng cấp** để mở/thu gọn thủ công. Khi hết máu, đang xem hoặc mất kết nối thì không được nâng.

Bỏ Chân nhanh, Nhai nhanh, Học nhanh và Cỏ tươi khỏi các kỹ năng có thể nâng. Dữ liệu cũ giữ tổng XP, skin và XP sưu tầm. Cấp được tính theo giới hạn mới 21; điểm còn lại được tính lại từ cấp và 4 kỹ năng còn giữ. Thưởng chỉ số tự động khi lên cấp vẫn áp dụng; tốc độ nhai trở về mức cơ bản.
## Thanh xem trận gọn

Người vào giữa combat hoặc đã hết máu dùng thanh nhỏ ở góc dưới bên trái. Nút **‹ / ›** chuyển qua các bò còn sống đang kết nối, quay vòng khi tới cuối danh sách. Có thể chọn trực tiếp bằng danh sách tên. Người đang xem rời phòng hoặc hết máu thì camera tự theo người còn sống khác. Không có ai còn sống thì các nút chuyển bị khóa.

Khi xem trận, ẩn bảng máu/XP của mình, bảng nâng nhanh, nút ăn và biểu cảm, cùng các thông báo nổi giữa màn hình. Thanh nhỏ giữ tên người đang xem và thời gian còn lại để vào vòng mới. Đồng hồ, điểm hai đội, Top và Menu vẫn hiện. Vòng mới tự đưa người xem trở lại chơi và hiện các bảng điều khiển.
## Đưa game lên GitHub Pages + Supabase

Game chạy trên GitHub Pages. Supabase cung cấp đăng nhập Google, lưu cấp/skill/skin và truyền dữ liệu phòng chơi bằng Realtime. Không cần Render. Các khóa `VITE_...` là khóa công khai dành cho trình duyệt. Tuyệt đối không đặt `service_role` hoặc database password vào GitHub Pages, GitHub Secrets của bước build web, hay file `.env` trong repo.

1. Tạo một project Supabase. Trong **SQL Editor**, chạy toàn bộ `supabase/setup.sql` một lần. Bật **Authentication → Providers → Anonymous** để khách có thể vào phòng. Bật Google sau khi đã thiết lập Google OAuth Client ID/Secret trong Supabase. Phần cấu hình Google ở Google Cloud phải dùng URL callback do Supabase hiển thị.
2. Trong **Authentication → URL Configuration**, đặt Site URL là `https://DoTDatt.github.io/hanh-tinh-co/`. Thêm URL này và `http://localhost:5173/` vào danh sách Redirect URLs. Cấu hình theo đúng domain/repo thực tế nếu tên kho đổi.
3. Lấy **Project URL** và **publishable key** trong Supabase. Trong GitHub repo → **Settings → Secrets and variables → Actions**, tạo `VITE_SUPABASE_URL` và `VITE_SUPABASE_PUBLISHABLE_KEY`. Không dùng khóa `service_role`.
4. Trong GitHub repo → **Settings → Pages**, chọn nguồn **GitHub Actions**. Chạy workflow **Deploy game** hoặc push nhánh `main`. Trang web sẽ có địa chỉ `https://DoTDatt.github.io/hanh-tinh-co/`.
5. Mở trang ở hai thiết bị. Cùng vào một mã phòng hoặc gửi link từ nút **Mời team**. Tài khoản Google giữ tên, XP, kỹ năng, skin và Top tài khoản khi đổi máy. Chơi khách giữ tiến trình riêng trên trình duyệt.

Mỗi phòng Realtime chọn một trình duyệt đang tham gia để điều phối luật chơi. Nếu trình duyệt đó rời phòng, người còn lại tiếp quản và bắt đầu lượt chuẩn bị mới. Phòng đang chạy chỉ giữ trong bộ nhớ của trình duyệt chủ phòng; Supabase không lưu trạng thái trận. Vì thế mô hình này phù hợp phòng bạn bè nhỏ, khoảng 2–4 người. Người chơi có thể sửa mã chạy trên máy mình, nên không dùng Top này cho phần thưởng có giá trị thật.

Nếu chưa có Supabase và chưa đặt biến phòng chung, GitHub Pages mở chế độ chơi một mình. Nút đăng nhập tắt. Khi đặt `VITE_ROOM_TRANSPORT=lan` và `VITE_ROOM_URL` bằng URL HTTPS của máy chủ WebSocket, trang Pages cho team vào một phòng chung. Bản LAN `npm run dev` hoặc `npm run play` vẫn dùng Node/WebSocket riêng. Để thử Supabase tại máy, sao chép `.env.example` thành `.env`, điền URL/key và dùng `npm run dev`; đặt `VITE_ROOM_TRANSPORT=supabase`. `.env` đã được Git bỏ qua.

## Chơi chung từ Internet qua Cloudflare Quick Tunnel

Khi chưa dùng được Supabase, có thể chạy máy chủ Node của game trên máy cá nhân và mở qua Cloudflare Quick Tunnel. Trang GitHub Pages vẫn là link ổn định cho người chơi; trình duyệt nối WebSocket tới URL tunnel lấy từ biến GitHub Actions `VITE_ROOM_URL`. Đặt `VITE_ROOM_TRANSPORT=lan`. Mọi người cùng vào một phòng; tính năng tạo nhiều mã phòng chưa áp dụng cho máy chủ Node này. Tiến trình tài khoản vẫn chỉ lưu trên trình duyệt.

Bản này cần máy chủ Node và cloudflared còn chạy, đồng thời máy tính còn bật. Quick Tunnel là dịch vụ tạm thời: URL có thể đổi khi khởi động lại và không có bảo đảm luôn hoạt động. Khi URL đổi, cập nhật `VITE_ROOM_URL` trong GitHub repo và chạy lại workflow **Deploy game**. Thư mục `.runtime/` chứa file chạy và log trên máy này, không được đưa vào Git.

Để chạy lại từ PowerShell trong `D:\MyProject`: đặt `$env:VITE_ROOM_TRANSPORT='lan'`, `$env:VITE_BASE_PATH='/'`, chạy `npm run build`, rồi đặt `$env:PORT='4173'`, `$env:HOST='127.0.0.1'` và chạy `node server/start.mjs`. Ở cửa sổ khác, chạy `.\.runtime\cloudflared.exe tunnel --no-autoupdate --url http://127.0.0.1:4173`. Dùng URL `https://...trycloudflare.com` mới in ra trong terminal để cập nhật biến GitHub. Không mở cổng router.
