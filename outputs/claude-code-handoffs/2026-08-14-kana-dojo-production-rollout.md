# KanaDojo 脳 鏄熺伀鍗曡瘝闂叧鐢熶骇鍙戝竷浜ゆ帴锛?026-08-14锛?
## 缁撹

鍗曡瘝闂叧宸蹭笂绾垮彲鐢ㄣ€侹anaDojo 浣跨敤 AGPL-3.0-or-later 妗嗘灦锛屾父鎴忕晫闈㈤€氳繃闂ㄦ埛鏃㈡湁鐨?`/api/portal/vocab-quest/*` 鏈嶅姟绔帴鍙ｈ鍙栨槦鐏?Supabase 璇剧▼锛涙病鏈変娇鐢ㄦ祻瑙堝櫒闅忔満棰樼洰锛屼篃娌℃湁瀵煎叆鍙︿竴濂楄瘝搴撴垨璁よ瘉浣撶郴銆?
## 绾夸笂鐗堟湰涓庨獙璇?
- 涓婚棬鎴凤細`42d4dce068fea2ad6ddce5d9f1e4cafbf3987e1c`
  - `https://internal.japanedupath.com/api/health` 杩斿洖 `{"ok":true}`銆?  - `https://eju.japanedupath.com/portal/my/word-quest` 杩斿洖 HTTP 200銆?- KanaDojo锛歚ffeab5137d10069b2f6cf7d6b5926fa32756b3d8`
  - `https://eju.japanedupath.com/kanadojo/api/healthcheck` 杩斿洖 `{"status":"ok"}`銆?  - `https://eju.japanedupath.com/kanadojo/spark` 杩斿洖 HTTP 200銆?  - PM2 `spark-kana-dojo` 鐘舵€佷负 `online`銆?- 浣跨敤涓存椂 `test` cohort QA 璐﹀彿楠屾敹鍚庡凡娓呯悊锛?  - N5銆丯3銆丯1 鍧囧彲璇诲彇鐪熷疄璇剧▼璺緞銆佸垱寤衡€滆璇嗏€濆叧鍗″苟姝ｅ父鏀惧純銆?  - KanaDojo handoff 杩斿洖 HTTP 200锛屽苟绛惧彂 `spark_kana_dojo_session`銆?  - QA 璐﹀彿銆? 涓細璇濆強璁块棶鐧藉悕鍗曞潎宸插垹闄わ紱娈嬬暀 QA 璐﹀彿鏁颁负 0銆?
## 鍙戝竷娴佺▼淇

1. 涓婚棬鎴?PR #629 宸插悎骞躲€俙deploy-production.yml` 鏀逛负 GitHub 鎵樼鏋勫缓 Next 杩愯鍖咃紝涓婃捣鏈嶅姟鍣ㄥ彧楠岃瘉閿佹枃浠躲€佸畨瑁?`.next`銆侀噸鍚?PM2 鍜屽仴搴锋鏌ャ€傛湇鍔″櫒涓嶅啀杩愯 `npm ci` 鎴?`npm run build`銆?2. KanaDojo PR #2 宸插悎骞讹細鎵樼楠岃瘉鍏堢敓鎴?gitignored 鐨?`shared/data/commitInfo.json`锛屽啀鎵ц TypeScript 妫€鏌ワ紝淇骞插噣 checkout 鐨勬瀯寤哄け璐ャ€?3. KanaDojo PR #3 宸插悎骞讹細瀹夎浠诲姟鏀圭敤涓撶敤鏍囩 `shanghai-kana-dojo`銆備笓鐢?runner 鏇捐鏃х殑鏈嶅姟鍣ㄦ瀯寤?OOM 缁堟锛岀幇宸叉仮澶嶅湪绾匡紱鏂板伐浣滄祦鍙畨瑁呰繍琛屽寘锛屼笉鍐嶅湪鏈嶅姟鍣ㄧ紪璇戙€?
## 浠嶉渶鍏虫敞

- 宸插喕缁撹绋嬩腑浠嶆湁 76 鏉℃帴澶淬€佹帴灏炬垨 `锝瀈 鍗犱綅寮忔潯鐩€傚畠浠笉鏄娉曡瘝鎬ц褰曪紝浣嗗唴瀹瑰洟闃熷簲鍐冲畾鏄惁绉诲嚭涓€鑸瘝姹囧叧鍗℃垨褰掑叆鏋勮瘝鍗曞厓锛涙湰杞病鏈夐潤榛樺垹闄ゆ垨鏇挎崲銆?- 绾夸笂鏈櫥褰曡闂?KanaDojo 浼氳瘹瀹炴彁绀衡€滆浠庢槦鐏涔犻棬鎴风櫥褰曞悗鍐嶈繘鍏ュ崟璇嶉棷鍏斥€濓紝涓嶄細鐢熸垚闅忔満棰樸€?- 鏈湴宸ヤ綔鏍戠殑 `.playwright-cli/` 涓?`output/` 鏄湭鎻愪氦鐨勪复鏃跺伐鍏风洰褰曪紱涓嶅睘浜庝骇鍝佹彁浜ゃ€?