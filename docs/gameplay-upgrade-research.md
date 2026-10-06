# Nghiên cứu nâng cấp gameplay

## Đề xuất chính: Tranh Cỏ Vàng

Nên thử một mục tiêu rõ trong vòng chơi hiện tại: **Tranh Cỏ Vàng**. Giữ nguyên 60 giây ăn cỏ và 120 giây combat. Trong combat, cả đội chạy quanh hành tinh để tranh bãi cỏ vàng xuất hiện lần lượt. Ăn cỏ lấy điểm; húc gây sát thương và đẩy đối thủ khỏi mục tiêu.

Đây là một đề xuất để thử với team, chưa phải kết luận rằng nó chắc chắn vui hơn. Nghiên cứu về game casual cho thấy thử thách và tiến trình vẫn quan trọng. Nghiên cứu cũng nhắc rằng thời lượng phiên chơi ngắn không phải quy tắc chung cho mọi game casual. Vì vậy, nên giữ nhịp vòng mà bạn đã chọn và thử thêm một mục tiêu có thể nhìn thấy, thay vì coi một thời lượng khác là công thức chung. [DiGRA: Formalizing casual games](https://dl.digra.org/index.php/dl/article/download/674/674/671)

### Luật bản thử đầu tiên

- Giữ vòng **60 giây ăn cỏ + 120 giây combat** như hiện tại.
- Trong combat, cứ 30 giây máy chủ đánh dấu một bãi cỏ vàng ở vị trí khác trên quả địa cầu. Đánh dấu bằng vòng sáng hoặc màu vàng dễ nhận ra.
- Ăn cỏ trong bãi vàng được **1 điểm cho mỗi cụm cỏ được máy chủ xác nhận**. Cỏ thường vẫn cho XP và hồi máu như hiện tại, nhưng không cho điểm trận.
- Húc chỉ dùng được trong combat, vẫn tốn stamina và gây sát thương/đẩy lùi theo luật hiện tại. Húc không cộng điểm; điểm chỉ đến từ việc tranh cỏ vàng.
- Khi hết máu, bò trở lại sau **5 giây** ở một điểm xa người vừa húc, với 50 máu và 2 giây được bảo vệ. Không có điểm thưởng khi hạ người khác.
- Hết giờ, người nhiều điểm nhất thắng. Hòa điểm thì cùng thắng.

Các con số đổi bãi mỗi 30 giây và hồi sinh sau 5 giây là **mốc để chơi thử**, không phải con số đã được nghiên cứu xác nhận cho game này. Bãi cỏ vàng gom mục tiêu và hành động quan trọng vào cùng một vùng. Những nhà thiết kế tham gia hội thảo GDC về thiết kế màn nhiều người chơi cũng khuyên đặt mục tiêu và phần chơi hấp dẫn nhất vào cùng không gian. [GDC 2018 Level Design Workshop](https://www.gamedeveloper.com/design/gdc-2018-level-design-workshop-an-expert-roundtable-q-a)

### Vì sao luật này hợp với game hiện tại

Game đã có đồng cỏ dùng chung, máy chủ xác nhận người ăn trước, hồi máu khi ăn, stamina và húc gây sát thương. Bãi cỏ vàng chủ yếu thêm vị trí cần tranh và điểm trận; không cần thêm nhân vật, bản đồ mới hay hệ thống vật phẩm. [README.md](../README.md) · [room-server.mjs](../server/room-server.mjs)

Cỏ vàng đổi vị trí định kỳ để cả đội phải di chuyển quanh hành tinh. Húc tạo cơ hội đẩy người khác khỏi mục tiêu, nhưng không tự đem lại điểm. Hồi sinh nhanh giúp người bị húc tiếp tục chơi trong combat. Đây là các lựa chọn thiết kế đề xuất để hạn chế việc một người chỉ đuổi đánh người khác; cần thử cùng team để xem có hiệu quả không.

Không nên tự động tăng điểm hoặc sát thương cho người đang thua ở bản đầu. Riot mô tả cơ chế gỡ thế thua tốt là tạo cơ hội khó nhưng có thể đạt được; nếu quá mạnh thì lợi thế ban đầu mất ý nghĩa, còn snowball quá mạnh thì gần như không thể lật lại. Với game này, đổi vị trí mục tiêu tạo cơ hội tranh lại bằng cách di chuyển và ăn cỏ, thay vì âm thầm cộng sức mạnh. [Riot: Comeback Mechanics](https://www.leagueoflegends.com/en-us/news/dev/quick-gameplay-thoughts-2-25-comeback-mechanics/)

### Nâng cấp nhỏ nên làm cùng

Hiển thị rõ điểm vừa ghi, lượng máu hồi và sát thương nhận ngay lúc sự kiện xảy ra. Thêm âm thanh ngắn và hiệu ứng nhẹ khi ăn trúng cỏ vàng hoặc bị húc. Khảo sát về “game feel” xem phản hồi rõ ràng là cách giúp người chơi hiểu sự kiện nào vừa xảy ra và cảm thấy thao tác có tác động. [Pichlmair & Johansen: Designing Game Feel](https://arxiv.org/abs/2011.09201)

## Cách thử trước khi mở rộng

Chạy 3 trận với team. Sau mỗi trận hỏi nhanh: mọi người có biết phải tranh gì không, có bị nằm chờ quá lâu không, và húc có giúp tranh cỏ hay chỉ khiến người chơi bỏ mục tiêu? Nếu nhiều người bị húc liên tục, tăng thời gian bảo vệ sau hồi sinh hoặc giảm sát thương. Nếu mọi người ít di chuyển, rút ngắn thời gian đổi bãi. Chưa nên thêm chuỗi nhiệm vụ, vật phẩm hay nhiều loại mode cho tới khi vòng chơi cơ bản vui.
