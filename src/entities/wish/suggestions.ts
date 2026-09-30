import type { WishCategory } from './types';

const SUGGESTIONS: Record<WishCategory, readonly string[]> = {
  family: [
    'Cầu mong ông bà cha mẹ luôn mạnh khoẻ, sống lâu bên con cháu.',
    'Ước cả nhà năm nào cũng được quây quần bên cây thông đêm Giáng sinh.',
    'Mong gia đình mình luôn bình an, đầm ấm và yêu thương nhau.',
    'Ước bố mẹ bớt vất vả, có thêm thời gian nghỉ ngơi.',
    'Mong anh chị em trong nhà luôn hoà thuận, đùm bọc nhau.',
  ],
  study: [
    'Ước con thi đỗ vào ngôi trường mơ ước.',
    'Mong năm học này học giỏi, được thầy cô và bạn bè yêu mến.',
    'Ước mình chăm chỉ hơn mỗi ngày và đạt học bổng.',
    'Mong kỳ thi sắp tới làm bài thật tốt, không run tay.',
    'Ước học được một ngoại ngữ mới thật thành thạo.',
  ],
  health: [
    'Cầu cho mọi người thân đều khoẻ mạnh, không ốm đau.',
    'Ước mình ngủ đủ giấc, ăn uống điều độ và vui vẻ mỗi ngày.',
    'Mong bà sớm khỏi bệnh, lại cười thật tươi.',
    'Ước năm nay chạy được trọn 10 km.',
    'Mong tâm an, thân khoẻ, sống chậm lại một chút.',
  ],
  love: [
    'Ước tìm được người thương cùng đón Giáng sinh năm sau.',
    'Mong chúng mình luôn thấu hiểu và nắm tay nhau thật lâu.',
    'Ước người ấy nhận ra tình cảm của mình.',
    'Mong tình yêu của hai đứa luôn ấm áp như ly cacao đêm tuyết.',
    'Ước dù xa cách, chúng mình vẫn cùng ngắm chung một bầu trời sao.',
  ],
  career: [
    'Ước công việc thuận lợi, được thăng tiến trong năm nay.',
    'Mong dự án mới thành công rực rỡ.',
    'Ước tìm được công việc mình thật sự yêu thích.',
    'Mong cửa hàng nhỏ của mình buôn may bán đắt.',
    'Ước đồng nghiệp luôn vui vẻ, hỗ trợ nhau hết mình.',
  ],
  other: [
    'Ước đêm Giáng sinh năm nay có tuyết rơi thật đẹp.',
    'Mong mọi em nhỏ đều nhận được một món quà Giáng sinh.',
    'Ước thế giới bình yên, không còn ai phải chịu khổ.',
    'Mong mình luôn giữ được niềm vui trẻ thơ như đêm Giáng sinh.',
    'Ước được đi du lịch thật nhiều nơi cùng người thân.',
  ],
};

export function getSuggestionsFor(category: WishCategory): readonly string[] {
  return SUGGESTIONS[category];
}

export function getSuggestion(category: WishCategory, rnd: () => number = Math.random): string {
  const list = SUGGESTIONS[category];
  return list[Math.floor(rnd() * list.length)] ?? list[0] ?? '';
}
