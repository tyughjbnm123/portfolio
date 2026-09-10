/* Shared catalog extracted from the existing action-card and FACS tools. */
(function(root){const data={
  "ACTIONS": [
    {
      "id": 1,
      "k": "摇镜建立",
      "zh": "由下往上搖鏡",
      "en": "Tilt-up establishing",
      "cat": [
        "open",
        "wide"
      ],
      "shot": "wide",
      "style": [
        "cool",
        "elegant"
      ],
      "tempo": [
        "slow"
      ],
      "shotZh": "廣角",
      "shotEn": "Wide",
      "risk": "mid",
      "hand": false,
      "p": "Camera slowly tilts up from waist level to face, establishing full character."
    },
    {
      "id": 2,
      "k": "整理头发微笑",
      "zh": "整理頭髮,露齒微笑",
      "en": "Adjust hair, beaming smile",
      "cat": [
        "open",
        "med"
      ],
      "shot": "medium",
      "style": [
        "sweet",
        "playful"
      ],
      "tempo": [
        "fast"
      ],
      "shotZh": "中景",
      "shotEn": "Medium",
      "risk": "low",
      "hand": true,
      "p": "Both hands lightly adjust hair, then a bright open-mouthed smile at camera."
    },
    {
      "id": 3,
      "k": "回眸",
      "zh": "回眸入鏡",
      "en": "Glance-back entrance",
      "cat": [
        "open",
        "med"
      ],
      "shot": "medium",
      "style": [
        "cool",
        "elegant"
      ],
      "tempo": [
        "slow"
      ],
      "shotZh": "中景",
      "shotEn": "Medium",
      "risk": "high",
      "hand": false,
      "p": "Starts side to camera, slowly turns head to look directly at lens."
    },
    {
      "id": 4,
      "k": "走近镜头",
      "zh": "走近鏡頭停住",
      "en": "Walk-in to camera",
      "cat": [
        "open",
        "med"
      ],
      "shot": "medium",
      "style": [
        "cool",
        "sweet"
      ],
      "tempo": [
        "fast"
      ],
      "shotZh": "中景→近景",
      "shotEn": "Medium→Close",
      "risk": "mid",
      "hand": false,
      "p": "Subject walks toward camera, stops close. Face fills the frame at the end."
    },
    {
      "id": 5,
      "k": "双手托脸",
      "zh": "雙手托臉,閉眼歪頭",
      "en": "Cup cheeks, eyes closed",
      "cat": [
        "mid",
        "close"
      ],
      "shot": "close",
      "style": [
        "sweet"
      ],
      "tempo": [
        "slow"
      ],
      "shotZh": "近景",
      "shotEn": "Close",
      "risk": "low",
      "hand": true,
      "p": "Both hands cup cheeks gently, eyes close, head tilts slightly, sweet soft smile."
    },
    {
      "id": 6,
      "k": "歪头眨眼",
      "zh": "歪頭眨眼俏皮",
      "en": "Tilt-head wink",
      "cat": [
        "mid",
        "close"
      ],
      "shot": "close",
      "style": [
        "sweet",
        "playful"
      ],
      "tempo": [
        "fast"
      ],
      "shotZh": "近景",
      "shotEn": "Close",
      "risk": "low",
      "hand": false,
      "p": "Head tilts to one side, slow deliberate wink, playful smirk at camera."
    },
    {
      "id": 7,
      "k": "捂半脸",
      "zh": "摀半邊臉露眼睛",
      "en": "Cover half face",
      "cat": [
        "mid",
        "close"
      ],
      "shot": "close",
      "style": [
        "cool",
        "playful"
      ],
      "tempo": [
        "fast"
      ],
      "shotZh": "近景",
      "shotEn": "Close",
      "risk": "mid",
      "hand": true,
      "p": "One hand covers lower half of face, only eyes visible above, eyes smiling."
    },
    {
      "id": 8,
      "k": "比耶",
      "zh": "比耶手勢歪頭",
      "en": "Peace sign tilt",
      "cat": [
        "mid",
        "close"
      ],
      "shot": "close",
      "style": [
        "sweet",
        "playful"
      ],
      "tempo": [
        "fast"
      ],
      "shotZh": "近景",
      "shotEn": "Close",
      "risk": "low",
      "hand": true,
      "p": "One hand makes a peace sign near face, head tilts, relaxed look at camera."
    },
    {
      "id": 9,
      "k": "双手比心",
      "zh": "雙手比心",
      "en": "Two-hand heart",
      "cat": [
        "mid",
        "close"
      ],
      "shot": "close",
      "style": [
        "sweet"
      ],
      "tempo": [
        "fast"
      ],
      "shotZh": "近景",
      "shotEn": "Close",
      "risk": "mid",
      "hand": true,
      "p": "Both hands form a heart shape at chest level, eyes glance up then back to camera."
    },
    {
      "id": 10,
      "k": "嘟嘴",
      "zh": "嘟嘴可愛表情",
      "en": "Cute pout",
      "cat": [
        "mid",
        "close"
      ],
      "shot": "close",
      "style": [
        "sweet",
        "playful"
      ],
      "tempo": [
        "slow"
      ],
      "shotZh": "近景",
      "shotEn": "Close",
      "risk": "low",
      "hand": false,
      "p": "Lips pout softly, slight innocent expression in eyes."
    },
    {
      "id": 11,
      "k": "轻碰下巴",
      "zh": "輕碰下巴俏皮眼神",
      "en": "Touch chin, playful eyes",
      "cat": [
        "mid",
        "close"
      ],
      "shot": "close",
      "style": [
        "playful",
        "sweet"
      ],
      "tempo": [
        "slow"
      ],
      "shotZh": "近景",
      "shotEn": "Close",
      "risk": "low",
      "hand": true,
      "p": "One finger lightly touches chin, eyes have a playful look at camera."
    },
    {
      "id": 12,
      "k": "托下巴傲娇",
      "zh": "托下巴帶傲嬌感",
      "en": "Prop chin, tsundere",
      "cat": [
        "mid",
        "close"
      ],
      "shot": "close",
      "style": [
        "cool",
        "playful"
      ],
      "tempo": [
        "slow"
      ],
      "shotZh": "近景",
      "shotEn": "Close",
      "risk": "low",
      "hand": true,
      "p": "Hand props chin, subtle smirk, slightly aloof proud expression."
    },
    {
      "id": 13,
      "k": "眯眼挑眉",
      "zh": "瞇眼挑眉搞怪",
      "en": "Squint & eyebrow raise",
      "cat": [
        "mid",
        "close"
      ],
      "shot": "close",
      "style": [
        "playful"
      ],
      "tempo": [
        "fast"
      ],
      "shotZh": "近景",
      "shotEn": "Close",
      "risk": "mid",
      "hand": false,
      "p": "Eyes squint, one eyebrow raises exaggeratedly, playful silly expression."
    },
    {
      "id": 14,
      "k": "侧脸转正",
      "zh": "側臉轉正面",
      "en": "Profile to front",
      "cat": [
        "mid",
        "close"
      ],
      "shot": "close",
      "style": [
        "elegant",
        "cool"
      ],
      "tempo": [
        "slow"
      ],
      "shotZh": "近景",
      "shotEn": "Close",
      "risk": "high",
      "hand": false,
      "p": "Profile angle shifts to front-facing, eyes meet camera at alignment."
    },
    {
      "id": 15,
      "k": "低头再仰头",
      "zh": "低頭再仰頭",
      "en": "Look down then up",
      "cat": [
        "mid",
        "close"
      ],
      "shot": "close",
      "style": [
        "elegant",
        "cool"
      ],
      "tempo": [
        "slow"
      ],
      "shotZh": "近景",
      "shotEn": "Close",
      "risk": "high",
      "hand": false,
      "p": "Head slowly drops down, holds a beat, then lifts back up to face camera."
    },
    {
      "id": 16,
      "k": "拨开头发",
      "zh": "撥開頭髮露臉",
      "en": "Sweep hair, reveal face",
      "cat": [
        "mid",
        "close"
      ],
      "shot": "close",
      "style": [
        "elegant",
        "sweet"
      ],
      "tempo": [
        "slow"
      ],
      "shotZh": "近景",
      "shotEn": "Close",
      "risk": "mid",
      "hand": true,
      "p": "One hand sweeps hair away from face, tucks behind ear, revealing full face."
    },
    {
      "id": 17,
      "k": "手指比框",
      "zh": "手指比框框住眼睛",
      "en": "Finger frame on eyes",
      "cat": [
        "mid",
        "close"
      ],
      "shot": "close",
      "style": [
        "playful",
        "cool"
      ],
      "tempo": [
        "fast"
      ],
      "shotZh": "近景",
      "shotEn": "Close",
      "risk": "mid",
      "hand": true,
      "p": "Both hands form a rectangle frame, eyes inside the frame looking at camera."
    },
    {
      "id": 18,
      "k": "肩膀弹动",
      "zh": "肩膀隨節拍彈動",
      "en": "Shoulder bounce on beat",
      "cat": [
        "mid",
        "med"
      ],
      "shot": "medium",
      "style": [
        "cool",
        "playful"
      ],
      "tempo": [
        "fast"
      ],
      "shotZh": "中景",
      "shotEn": "Medium",
      "risk": "low",
      "hand": false,
      "p": "Shoulders bounce lightly on beat, body sways naturally, relaxed confident."
    },
    {
      "id": 19,
      "k": "俯角仰拍",
      "zh": "仰角鏡頭俯視",
      "en": "Low-angle look-down",
      "cat": [
        "mid",
        "close"
      ],
      "shot": "close",
      "style": [
        "cool"
      ],
      "tempo": [
        "fast"
      ],
      "shotZh": "近景",
      "shotEn": "Close",
      "risk": "mid",
      "hand": false,
      "p": "Camera placed below, subject looks down at lens. Dominant cool-girl energy."
    },
    {
      "id": 20,
      "k": "闭眼再睁眼",
      "zh": "閉眼深呼吸再睜眼",
      "en": "Close eyes then open",
      "cat": [
        "mid",
        "close"
      ],
      "shot": "close",
      "style": [
        "elegant"
      ],
      "tempo": [
        "slow"
      ],
      "shotZh": "近景",
      "shotEn": "Close",
      "risk": "low",
      "hand": false,
      "p": "Eyes close gently, a beat of stillness, then slowly open at camera."
    },
    {
      "id": 21,
      "k": "酷拽直视",
      "zh": "酷拽直視,表情歸零",
      "en": "Cool neutral gaze",
      "cat": [
        "end",
        "close"
      ],
      "shot": "close",
      "style": [
        "cool"
      ],
      "tempo": [
        "fast",
        "slow"
      ],
      "shotZh": "近景",
      "shotEn": "Close",
      "risk": "low",
      "hand": false,
      "p": "Expression drops to neutral cool gaze, eyes sharp and direct at camera."
    },
    {
      "id": 22,
      "k": "侧边走入定格",
      "zh": "從側邊走入畫面定格",
      "en": "Walk-in freeze",
      "cat": [
        "end",
        "med"
      ],
      "shot": "medium",
      "style": [
        "cool"
      ],
      "tempo": [
        "fast"
      ],
      "shotZh": "中景",
      "shotEn": "Medium",
      "risk": "mid",
      "hand": false,
      "p": "Subject walks into frame from the edge, stops at center, stares at camera."
    },
    {
      "id": 23,
      "k": "缓慢后退",
      "zh": "緩慢後退拉開距離",
      "en": "Slow step-back",
      "cat": [
        "end",
        "wide"
      ],
      "shot": "wide",
      "style": [
        "elegant",
        "cool"
      ],
      "tempo": [
        "slow"
      ],
      "shotZh": "廣角",
      "shotEn": "Wide",
      "risk": "mid",
      "hand": false,
      "p": "Subject takes slow steps backward, increasing distance, holds final position."
    },
    {
      "id": 24,
      "k": "转身背对",
      "zh": "轉身背對鏡頭",
      "en": "Turn away ending",
      "cat": [
        "end",
        "med"
      ],
      "shot": "medium",
      "style": [
        "cool",
        "elegant"
      ],
      "tempo": [
        "slow"
      ],
      "shotZh": "中景",
      "shotEn": "Medium",
      "risk": "high",
      "hand": false,
      "p": "Subject slowly turns away from camera, stops with back to lens."
    },
    {
      "id": 25,
      "k": "手遮脸揭示",
      "zh": "手遮臉再放下揭示",
      "en": "Hand reveal",
      "cat": [
        "mid",
        "close"
      ],
      "shot": "close",
      "style": [
        "playful",
        "cool"
      ],
      "tempo": [
        "fast"
      ],
      "shotZh": "近景",
      "shotEn": "Close",
      "risk": "mid",
      "hand": true,
      "p": "One hand raises to cover face, holds a beat, then lowers to reveal expression."
    },
    {
      "id": 26,
      "k": "唇部特写",
      "zh": "極近唇部特寫",
      "en": "Extreme lip close-up",
      "cat": [
        "mid",
        "close"
      ],
      "shot": "close",
      "style": [
        "cool",
        "elegant"
      ],
      "tempo": [
        "slow"
      ],
      "shotZh": "近景特寫",
      "shotEn": "Extreme close",
      "risk": "low",
      "hand": false,
      "p": "Camera pushes to extreme close-up on lips. Subtle smile or finger touches lip."
    },
    {
      "id": 27,
      "k": "眼部特写",
      "zh": "極近眼部特寫",
      "en": "Extreme eye close-up",
      "cat": [
        "mid",
        "close"
      ],
      "shot": "close",
      "style": [
        "elegant",
        "cool"
      ],
      "tempo": [
        "slow"
      ],
      "shotZh": "近景特寫",
      "shotEn": "Extreme close",
      "risk": "low",
      "hand": false,
      "p": "Camera pushes to extreme close-up on eyes, direct gaze at lens, lashes sharp."
    },
    {
      "id": 28,
      "k": "摊手无奈",
      "zh": "雙手攤開俏皮投降",
      "en": "Playful shrug",
      "cat": [
        "mid",
        "med"
      ],
      "shot": "medium",
      "style": [
        "playful"
      ],
      "tempo": [
        "fast"
      ],
      "shotZh": "中景",
      "shotEn": "Medium",
      "risk": "mid",
      "hand": true,
      "p": "Both hands raise open palms upward in a playful surrender gesture, smirking."
    },
    {
      "id": 29,
      "k": "咬唇上望",
      "zh": "咬嘴唇,眼神上飄",
      "en": "Bite lip, look up",
      "cat": [
        "mid",
        "close"
      ],
      "shot": "close",
      "style": [
        "sweet",
        "cool"
      ],
      "tempo": [
        "slow"
      ],
      "shotZh": "近景",
      "shotEn": "Close",
      "risk": "low",
      "hand": false,
      "p": "Lower lip caught lightly, eyes gaze upward, dreamy sweet expression."
    },
    {
      "id": 30,
      "k": "身体¾侧",
      "zh": "身體轉¾側增層次",
      "en": "Three-quarter turn",
      "cat": [
        "mid",
        "med"
      ],
      "shot": "medium",
      "style": [
        "elegant",
        "cool"
      ],
      "tempo": [
        "slow"
      ],
      "shotZh": "中景",
      "shotEn": "Medium",
      "risk": "high",
      "hand": false,
      "p": "Body turns to three-quarter angle while face remains toward camera."
    },
    {
      "id": 31,
      "k": "转圈",
      "zh": "原地轉圈",
      "en": "Spin in place",
      "cat": [
        "mid",
        "med"
      ],
      "shot": "medium",
      "style": [
        "playful",
        "sweet"
      ],
      "tempo": [
        "fast"
      ],
      "shotZh": "中景",
      "shotEn": "Medium",
      "risk": "high",
      "hand": false,
      "p": "Subject spins around in place once, hair and clothing flowing with the motion, ending facing camera."
    },
    {
      "id": 32,
      "k": "跳跃",
      "zh": "輕跳一下",
      "en": "Little jump",
      "cat": [
        "mid",
        "med"
      ],
      "shot": "medium",
      "style": [
        "playful"
      ],
      "tempo": [
        "fast"
      ],
      "shotZh": "中景",
      "shotEn": "Medium",
      "risk": "mid",
      "hand": false,
      "p": "A light energetic jump on the beat, body lifts off slightly, cheerful expression."
    },
    {
      "id": 33,
      "k": "高举双手",
      "zh": "雙手高舉歡呼",
      "en": "Arms up cheer",
      "cat": [
        "mid",
        "med"
      ],
      "shot": "medium",
      "style": [
        "playful"
      ],
      "tempo": [
        "fast"
      ],
      "shotZh": "中景",
      "shotEn": "Medium",
      "risk": "mid",
      "hand": true,
      "p": "Both arms raise up high in a cheerful celebratory gesture, bright smile."
    },
    {
      "id": 34,
      "k": "拍手",
      "zh": "拍手打節拍",
      "en": "Clap to beat",
      "cat": [
        "mid",
        "med"
      ],
      "shot": "medium",
      "style": [
        "playful",
        "sweet"
      ],
      "tempo": [
        "fast"
      ],
      "shotZh": "中景",
      "shotEn": "Medium",
      "risk": "mid",
      "hand": true,
      "p": "Hands clap together on the beat, body bounces lightly, playful energy."
    },
    {
      "id": 35,
      "k": "踏步",
      "zh": "原地踏步律動",
      "en": "Step in rhythm",
      "cat": [
        "mid",
        "med"
      ],
      "shot": "medium",
      "style": [
        "cool",
        "playful"
      ],
      "tempo": [
        "fast"
      ],
      "shotZh": "中景",
      "shotEn": "Medium",
      "risk": "mid",
      "hand": false,
      "p": "Subject steps in place to the rhythm, hips sway, confident groove."
    },
    {
      "id": 36,
      "k": "甩头发",
      "zh": "甩頭髮",
      "en": "Hair flip",
      "cat": [
        "mid",
        "med"
      ],
      "shot": "medium",
      "style": [
        "cool",
        "elegant"
      ],
      "tempo": [
        "fast"
      ],
      "shotZh": "中景",
      "shotEn": "Medium",
      "risk": "high",
      "hand": false,
      "p": "Subject flips hair with a quick head motion, hair fanning out, confident look back to camera."
    },
    {
      "id": 37,
      "k": "扭胯",
      "zh": "扭胯擺動",
      "en": "Hip sway",
      "cat": [
        "mid",
        "med"
      ],
      "shot": "medium",
      "style": [
        "cool"
      ],
      "tempo": [
        "fast"
      ],
      "shotZh": "中景",
      "shotEn": "Medium",
      "risk": "low",
      "hand": false,
      "p": "Hips sway side to side to the beat, upper body relaxed, confident attitude."
    },
    {
      "id": 38,
      "k": "产品展示",
      "zh": "舉起產品展示",
      "en": "Hold up product",
      "cat": [
        "mid",
        "close"
      ],
      "shot": "close",
      "style": [
        "cool",
        "elegant"
      ],
      "tempo": [
        "slow"
      ],
      "shotZh": "近景",
      "shotEn": "Close",
      "risk": "mid",
      "hand": true,
      "p": "Subject holds an item up beside the face, presenting it to camera, soft smile toward the product then to lens."
    },
    {
      "id": 39,
      "k": "拍照姿势",
      "zh": "擺拍照姿勢",
      "en": "Photo pose",
      "cat": [
        "mid",
        "med"
      ],
      "shot": "medium",
      "style": [
        "cool",
        "playful"
      ],
      "tempo": [
        "fast"
      ],
      "shotZh": "中景",
      "shotEn": "Medium",
      "risk": "mid",
      "hand": true,
      "p": "Subject strikes a fashion photo pose, one hand on hip, chin slightly raised, confident gaze."
    },
    {
      "id": 40,
      "k": "理头发侧",
      "zh": "撩起側邊頭髮",
      "en": "Tuck side hair",
      "cat": [
        "mid",
        "close"
      ],
      "shot": "close",
      "style": [
        "elegant",
        "cool"
      ],
      "tempo": [
        "slow"
      ],
      "shotZh": "近景",
      "shotEn": "Close",
      "risk": "mid",
      "hand": true,
      "p": "Subject runs fingers through side hair and lifts it, exposing the neckline, slow elegant motion."
    },
    {
      "id": 41,
      "k": "回头转身",
      "zh": "轉身回頭看",
      "en": "Turn and glance back",
      "cat": [
        "mid",
        "med"
      ],
      "shot": "medium",
      "style": [
        "cool",
        "elegant"
      ],
      "tempo": [
        "slow"
      ],
      "shotZh": "中景",
      "shotEn": "Medium",
      "risk": "high",
      "hand": false,
      "p": "Subject turns body away then glances back over the shoulder toward camera, mysterious mood."
    },
    {
      "id": 42,
      "k": "双手插兜",
      "zh": "雙手插口袋耍酷",
      "en": "Hands in pockets",
      "cat": [
        "mid",
        "med"
      ],
      "shot": "medium",
      "style": [
        "cool"
      ],
      "tempo": [
        "slow"
      ],
      "shotZh": "中景",
      "shotEn": "Medium",
      "risk": "low",
      "hand": false,
      "p": "Subject puts hands in pockets, relaxed cool stance, slight head tilt, effortless attitude."
    }
  ],
  "CAMERAS": [
    {
      "v": "front",
      "risk": "low"
    },
    {
      "v": "lowAngle",
      "risk": "mid"
    },
    {
      "v": "highAngle",
      "risk": "mid"
    },
    {
      "v": "side",
      "risk": "high"
    },
    {
      "v": "orbit",
      "risk": "high"
    },
    {
      "v": "pushPull",
      "risk": "mid"
    },
    {
      "v": "none",
      "risk": "low"
    }
  ],
  "CAM_PROMPT": {
    "front": {
      "zh": "正面或微側角度,平視",
      "en": "front or slight-angle, eye level"
    },
    "lowAngle": {
      "zh": "低角度仰拍,從下方約30度仰望",
      "en": "low-angle shot, looking up ~30 degrees from below"
    },
    "highAngle": {
      "zh": "高角度俯拍,從上方俯視",
      "en": "high-angle shot, looking down from above"
    },
    "side": {
      "zh": "側面或大角度,帶空間層次",
      "en": "profile or wide angle with spatial depth"
    },
    "orbit": {
      "zh": "鏡頭環繞人物緩慢移動",
      "en": "camera slowly orbits around the subject"
    },
    "pushPull": {
      "zh": "鏡頭推軌或緩慢拉遠",
      "en": "dolly push-in or slow pull-back"
    },
    "none": {
      "zh": "",
      "en": ""
    }
  },
  "AU_INFO": {
    "AU1": {
      "name": "內眉上抬",
      "group": "brow"
    },
    "AU2": {
      "name": "外眉上抬",
      "group": "brow"
    },
    "AU4": {
      "name": "眉毛下壓",
      "group": "brow"
    },
    "AU5": {
      "name": "上眼瞼抬起",
      "group": "eye"
    },
    "AU6": {
      "name": "臉頰上抬",
      "group": "eye"
    },
    "AU7": {
      "name": "眼瞼收緊",
      "group": "eye"
    },
    "AU41": {
      "name": "上眼瞼下垂",
      "group": "eye"
    },
    "AU46": {
      "name": "單眼眨眼",
      "group": "eye"
    },
    "AU9": {
      "name": "皺鼻",
      "group": "nose"
    },
    "AU10": {
      "name": "上唇抬起",
      "group": "upper"
    },
    "AU12": {
      "name": "嘴角上揚",
      "group": "upper"
    },
    "AU13": {
      "name": "嘴角加深",
      "group": "upper"
    },
    "AU22": {
      "name": "嘴唇向外翻",
      "group": "upper"
    },
    "AU15": {
      "name": "嘴角下拉",
      "group": "lower"
    },
    "AU16": {
      "name": "下唇下拉",
      "group": "lower"
    },
    "AU17": {
      "name": "下巴抬起",
      "group": "lower"
    },
    "AU26": {
      "name": "下顎放鬆",
      "group": "lower"
    },
    "AU27": {
      "name": "嘴巴大幅張開",
      "group": "lower"
    }
  },
  "AU_ORDER": [
    "AU1",
    "AU2",
    "AU4",
    "AU5",
    "AU6",
    "AU7",
    "AU41",
    "AU46",
    "AU9",
    "AU10",
    "AU12",
    "AU13",
    "AU22",
    "AU15",
    "AU16",
    "AU17",
    "AU26",
    "AU27"
  ],
  "GROUP_LABELS": {
    "brow": "眉毛",
    "eye": "眼部",
    "nose": "鼻部",
    "upper": "上唇與嘴角",
    "lower": "下唇與下顎"
  },
  "PRESETS_NATURAL": {
    "neutral": {},
    "happy": {
      "AU6": 1.2,
      "AU7": 0.3,
      "AU12": 1.8,
      "AU13": 0.4,
      "AU26": 0.2
    },
    "sad": {
      "AU1": 1.4,
      "AU4": 0.7,
      "AU15": 1,
      "AU17": 0.4,
      "AU41": 0.4
    },
    "angry": {
      "AU4": 1.7,
      "AU5": 0.3,
      "AU7": 1.1,
      "AU9": 0.2,
      "AU15": 0.3,
      "AU17": 0.3
    },
    "surprised": {
      "AU1": 1.4,
      "AU2": 1.3,
      "AU5": 1.5,
      "AU26": 1,
      "AU27": 0.5
    },
    "disgust": {
      "AU4": 0.5,
      "AU7": 0.5,
      "AU9": 1.2,
      "AU10": 0.8,
      "AU15": 0.2
    },
    "fear": {
      "AU1": 1.1,
      "AU2": 0.8,
      "AU4": 0.5,
      "AU5": 1.3,
      "AU7": 0.4,
      "AU15": 0.4,
      "AU26": 0.7
    },
    "contempt": {
      "AU7": 0.3,
      "AU12": 0.7,
      "AU13": 0.8,
      "AU15": 0.2
    }
  },
  "EXPR_LABEL_ZH": {
    "neutral": "中性",
    "happy": "開心",
    "sad": "悲傷",
    "angry": "憤怒",
    "surprised": "驚訝",
    "disgust": "厭惡",
    "fear": "恐懼",
    "contempt": "輕蔑"
  }
};if(typeof module==='object'&&module.exports)module.exports=data;else root.StoryboardData=data;})(globalThis);
