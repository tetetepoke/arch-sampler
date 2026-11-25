# テスト対策ドリル

## ファイル構成
```
index.html                         画面の土台（問題ファイルの読み込みを1行足すだけ）
style.css                          デザイン
app.js                             アプリ本体（問題を増やすときは触らない）
data/registry.js                   問題の登録口・学年/教科/小単元の表示順
data/j1-social-geo-asia-southeast.js   中1 社会 地理 アジア州 東南アジア
data/j1-social-geo-asia-regions.js     中1 社会 地理 アジア州 全体・東・南・西・中央
```

## 新しい単元を追加する手順（例：中1 社会 歴史 鎌倉時代）
1. `data/j1-social-history-kamakura.js` を作る
2. `index.html` の「① 問題データ」の下に1行足す
   `<script src="data/j1-social-history-kamakura.js"></script>`
3. これで、ホーム画面に「中学1年 › 社会 › 歴史 › 鎌倉時代」が自動で出てくる

```js
StudyData.addUnit(
  { grade: "中学1年", subject: "社会", field: "歴史", unit: "鎌倉時代", section: "" },
  [
    { id: "j1-his-kama-001", type: "choice", difficulty: 1, tags: ["源頼朝"],
      question: "1192年ごろ、征夷大将軍に任命されたのはだれ？",
      choices: ["源頼朝", "平清盛", "足利尊氏", "北条時宗"],
      answer: "源頼朝",
      explanation: "源頼朝は鎌倉に幕府を開き、武士による政治を始めた。" }
  ]
);
```

## 問題の形式
| type | 内容 | answer |
|---|---|---|
| choice | 4択 | 正解の選択肢の文字列 |
| tf | ○× | true（○）/ false（×） |
| fill | 穴埋め。choices があれば選択式、なければ文字入力（accept: ["別解"] も可） | 正解の文字列 |
| oneword | 一問一答（答えを見て自己採点） | 答えの文字列 |

- `id` は全体で重複しないように（重複はコンソールに警告が出て読み込まれない）
- `difficulty` は 1〜3（★の数）。基礎問題モードは 1〜2 を優先
- `section` を空にすると、単元がそのまま最後の選択肢になる
- 小単元の表示順は `data/registry.js` の `order` に書く

## 保存データ（localStorage キー: teststudy.v1）
問題ごとの正解数・不正解数・連続正解数・状態（new / ok / weak=要復習 / mastered=習得）、回答履歴（最新3000件）、日別の回答数、連続正解・最高連続正解、経験値、今日の目標、前回の学習範囲。
