# Clothing sweeps: main before the fit against this branch

The census (`tools/clothing-census.mjs`) through the game's motions on the whole body, all eleven mammals (`tools/clothing-sweep.mjs`; see [CLOTHING-SKINNING.md](../../../CLOTHING-SKINNING.md)). Made with `node tools/clothing-sweep.mjs --summary docs/tactics/hybrid-review/clothing/sweeps`.

| motion | before | after | went | came | net | crossings alone |
|---|---|---|---|---|---|---|
| stance | 2791 | 2739 | -76 | +24 | -2% | 2523 -> 2516 (-0%) |
| fall | 3951 | 3862 | -114 | +25 | -2% | 3594 -> 3589 (-0%) |
| walk | 9339 | 9339 | -0 | +0 | 0% | 8642 -> 8642 (0%) |
| aim | 23850 | 23590 | -685 | +425 | -1% | 20860 -> 20950 (0%) |
| throw | 18419 | 17227 | -1579 | +387 | -6% | 15987 -> 15798 (-1%) |
| fire | 11656 | 11656 | -0 | +0 | 0% | 10996 -> 10996 (0%) |
| burn | 16974 | 16698 | -276 | +0 | -2% | 15641 -> 15499 (-1%) |
| mantle | 20663 | 19810 | -1057 | +204 | -4% | 18762 -> 18546 (-1%) |
| descent | 9269 | 9074 | -203 | +8 | -2% | 8836 -> 8746 (-1%) |
| ladder | 20506 | 19460 | -1230 | +184 | -5% | 17912 -> 17772 (-1%) |
| draw | 784 | 784 | -0 | +0 | 0% | 775 -> 775 (0%) |

| character | before | after | went | came | net | crossings alone |
|---|---|---|---|---|---|---|
| horse | 11119 | 10631 | -722 | +234 | -4% | 9912 -> 9908 (-0%) |
| goat | 11047 | 10356 | -764 | +73 | -6% | 9953 -> 9710 (-2%) |
| bull | 11902 | 11659 | -282 | +39 | -2% | 10799 -> 10797 (-0%) |
| cow | 12144 | 11878 | -386 | +120 | -2% | 11073 -> 11049 (-0%) |
| donkey | 11605 | 11070 | -535 | +0 | -5% | 10715 -> 10426 (-3%) |
| sheep | 15891 | 15346 | -820 | +275 | -3% | 13857 -> 13688 (-1%) |
| skunk | 10708 | 10440 | -269 | +1 | -3% | 9932 -> 9923 (-0%) |
| pig-foreman | 14420 | 14198 | -389 | +167 | -2% | 13281 -> 13309 (0%) |
| pig-director | 10356 | 10274 | -82 | +0 | -1% | 9463 -> 9425 (-0%) |
| rabbit | 12120 | 11964 | -393 | +237 | -1% | 10983 -> 11073 (1%) |
| dog | 16890 | 16423 | -578 | +111 | -3% | 14560 -> 14521 (-0%) |

| region | before | after | went | came | net | crossings alone |
|---|---|---|---|---|---|---|
| neck | 14475 | 10560 | -5165 | +1250 | -27% | 8286 -> 7617 (-8%) |
| arm | 29036 | 29036 | -5 | +5 | 0% | 28385 -> 28385 (0%) |
| torso | 67838 | 67815 | -25 | +2 | -0% | 61429 -> 61424 (-0%) |
| legs | 26853 | 26828 | -25 | +0 | -0% | 26428 -> 26403 (-0%) |

(crossings alone: without the pairs where an inner part goes under an outer one, which is covering, not crossing)

worse by 10 frames or more, or 1 mm deeper (91; 68 of them crossings, 23 covering, marked ~):
  ~sheep ladder: unified sheep skull ears and wool into fitted neckerchief wrap @neck: 2 fr (3.2 mm) -> 95 fr (4.0 mm)
   rabbit aim: fitted neckerchief wrap through itself @neck: 0 fr (- mm) -> 60 fr (5.6 mm)
   horse aim: connected overalls seat and legs into connected shirt and sleeves @neck: 0 fr (- mm) -> 50 fr (9.8 mm)
   dog aim: fitted neckerchief wrap through itself @neck: 0 fr (- mm) -> 50 fr (8.8 mm)
   rabbit mantle: fitted neckerchief wrap into connected shirt and sleeves @neck: 0 fr (- mm) -> 46 fr (5.2 mm)
   pig-foreman aim: connected trousers belt and braces into connected shirt and sleeves @neck: 10 fr (15.3 mm) -> 50 fr (15.3 mm)
   sheep throw: fitted neckerchief wrap through itself @neck: 0 fr (- mm) -> 36 fr (8.5 mm)
   pig-foreman ladder: connected trousers belt and braces into connected shirt and sleeves @neck: 0 fr (- mm) -> 32 fr (10.3 mm)
   pig-foreman throw: connected trousers belt and braces into connected shirt and sleeves @neck: 28 fr (16.6 mm) -> 55 fr (16.6 mm)
  ~horse throw: connected shirt and sleeves into connected overalls seat and legs @neck: 0 fr (- mm) -> 25 fr (10.8 mm)
   pig-foreman ladder: connected shirt and sleeves through itself @neck: 0 fr (- mm) -> 25 fr (3.4 mm)
  ~pig-foreman ladder: connected shirt and sleeves into connected trousers belt and braces @neck: 0 fr (- mm) -> 25 fr (5.1 mm)
   cow throw: fitted neckerchief wrap through itself @neck: 0 fr (- mm) -> 23 fr (5.0 mm)
   rabbit throw: fitted neckerchief wrap through itself @neck: 0 fr (- mm) -> 23 fr (5.2 mm)
   dog throw: fitted neckerchief wrap through itself @neck: 0 fr (- mm) -> 23 fr (6.9 mm)
  ~goat throw: connected shirt and sleeves into connected overalls seat and legs @neck: 0 fr (- mm) -> 22 fr (8.8 mm)
   sheep throw: fitted neckerchief wrap into fitted waistcoat with pointed hem @neck: 0 fr (- mm) -> 22 fr (4.8 mm)
  ~rabbit mantle: connected shirt and sleeves into fitted neckerchief wrap @neck: 0 fr (- mm) -> 22 fr (4.0 mm)
  ~cow throw: connected shirt and sleeves into connected overalls seat and legs @neck: 0 fr (- mm) -> 21 fr (5.9 mm)
   sheep mantle: fitted neckerchief wrap through itself @neck: 0 fr (- mm) -> 21 fr (5.1 mm)
   horse throw: mane crest through itself @neck: 0 fr (- mm) -> 20 fr (5.8 mm)
  ~goat throw: connected overalls seat and legs into goat beard @neck: 5 fr (9.3 mm) -> 25 fr (12.8 mm)
   goat throw: goat beard into connected overalls seat and legs @neck: 5 fr (14.5 mm) -> 25 fr (15.7 mm)
  ~bull aim: connected shirt and sleeves into connected overalls seat and legs @neck: 0 fr (- mm) -> 20 fr (4.0 mm)
   cow aim: fitted neckerchief wrap into connected overalls seat and legs @neck: 0 fr (- mm) -> 20 fr (4.3 mm)
   rabbit aim: fitted neckerchief wrap into connected overalls seat and legs @neck: 0 fr (- mm) -> 20 fr (4.8 mm)
   horse throw: connected overalls seat and legs into connected shirt and sleeves @neck: 0 fr (- mm) -> 19 fr (7.1 mm)
  ~horse mantle: unified skull jaw neck and ears into connected shirt and sleeves @neck: 0 fr (- mm) -> 19 fr (8.3 mm)
   cow mantle: fitted neckerchief wrap into connected shirt and sleeves @neck: 0 fr (- mm) -> 19 fr (3.2 mm)
  ~rabbit throw: connected shirt and sleeves into connected overalls seat and legs @neck: 0 fr (- mm) -> 19 fr (3.2 mm)
   dog mantle: fitted neckerchief wrap through itself @neck: 0 fr (- mm) -> 19 fr (4.4 mm)
   horse throw: connected overalls seat and legs into unified skull jaw neck and ears @neck: 8 fr (3.7 mm) -> 26 fr (7.0 mm)
   horse mantle: connected overalls seat and legs into unified skull jaw neck and ears @neck: 0 fr (- mm) -> 15 fr (3.5 mm)
   sheep mantle: fitted waistcoat with pointed hem into connected shirt and sleeves @neck: 3 fr (>23 mm) -> 16 fr (>23 mm)
   sheep mantle: fitted waistcoat with pointed hem through itself @neck: 0 fr (- mm) -> 13 fr (5.1 mm)
  ~sheep mantle: connected shirt and sleeves into fitted waistcoat with pointed hem @neck: 0 fr (- mm) -> 13 fr (6.3 mm)
  ~horse throw: unified skull jaw neck and ears into connected overalls seat and legs @neck: 9 fr (8.5 mm) -> 21 fr (5.8 mm)
   horse throw: connected shirt and sleeves into unified skull jaw neck and ears @neck: 0 fr (- mm) -> 12 fr (4.8 mm)
   goat throw: connected overalls seat and legs into connected shirt and sleeves @neck: 0 fr (- mm) -> 11 fr (3.7 mm)
   horse fall: connected overalls seat and legs into unified skull jaw neck and ears @neck: 0 fr (- mm) -> 10 fr (10.8 mm)
   horse aim: mane crest through itself @neck: 0 fr (- mm) -> 10 fr (12.8 mm)
   bull aim: connected overalls seat and legs into connected shirt and sleeves @neck: 0 fr (- mm) -> 10 fr (9.6 mm)
   cow aim: fitted neckerchief wrap through itself @neck: 0 fr (- mm) -> 10 fr (5.5 mm)
   cow aim: connected overalls seat and legs into connected shirt and sleeves @neck: 0 fr (- mm) -> 10 fr (7.9 mm)
   cow aim: fitted neckerchief wrap into connected shirt and sleeves @neck: 0 fr (- mm) -> 10 fr (7.6 mm)
   sheep aim: fitted neckerchief wrap through itself @neck: 0 fr (- mm) -> 10 fr (8.1 mm)
   sheep aim: fitted waistcoat with pointed hem through itself @neck: 0 fr (- mm) -> 10 fr (4.8 mm)
   sheep aim: fitted neckerchief wrap into connected shirt and sleeves @neck: 0 fr (- mm) -> 10 fr (14.6 mm)
  ~sheep aim: connected shirt and sleeves into fitted waistcoat with pointed hem @neck: 0 fr (- mm) -> 10 fr (3.4 mm)
   sheep aim: fitted waistcoat with pointed hem into connected shirt and sleeves @neck: 0 fr (- mm) -> 10 fr (3.8 mm)
  ~pig-foreman throw: connected shirt and sleeves into connected trousers belt and braces @neck: 11 fr (7.5 mm) -> 21 fr (8.5 mm)
   rabbit aim: connected overalls seat and legs into connected shirt and sleeves @neck: 0 fr (- mm) -> 10 fr (8.3 mm)
   rabbit aim: fitted neckerchief wrap into connected shirt and sleeves @neck: 0 fr (- mm) -> 10 fr (6.0 mm)
  ~rabbit aim: connected shirt and sleeves into fitted neckerchief wrap @neck: 0 fr (- mm) -> 10 fr (3.4 mm)
   dog aim: fitted neckerchief wrap into connected jacket shirt and sleeves @neck: 0 fr (- mm) -> 10 fr (12.8 mm)
   rabbit descent: fitted neckerchief wrap into connected shirt and sleeves @neck: 0 fr (- mm) -> 8 fr (3.2 mm)
   pig-foreman fall: connected trousers belt and braces into connected shirt and sleeves @neck: 0 fr (- mm) -> 7 fr (10.3 mm)
   sheep throw: fitted waistcoat with pointed hem through itself @neck: 0 fr (- mm) -> 4 fr (4.4 mm)
   horse stance: connected overalls seat and legs into unified skull jaw neck and ears @neck: 0 fr (- mm) -> 3 fr (10.1 mm)
   horse fall: mane crest into unified skull jaw neck and ears @neck: 4 fr (12.9 mm) -> 7 fr (17.3 mm)
   rabbit stance: fitted neckerchief wrap into connected shirt and sleeves @neck: 0 fr (- mm) -> 3 fr (5.2 mm)
   horse fall: connected shirt and sleeves into unified skull jaw neck and ears @neck: 0 fr (- mm) -> 2 fr (7.3 mm)
   bull stance: connected overalls seat and legs into connected shirt and sleeves @neck: 1 fr (3.7 mm) -> 3 fr (9.5 mm)
   cow stance: fitted neckerchief wrap into connected shirt and sleeves @neck: 0 fr (- mm) -> 2 fr (3.2 mm)
   sheep stance: fitted neckerchief wrap through itself @neck: 0 fr (- mm) -> 2 fr (8.3 mm)
   sheep stance: fitted waistcoat with pointed hem through itself @neck: 0 fr (- mm) -> 2 fr (5.8 mm)
   dog stance: fitted neckerchief wrap through itself @neck: 0 fr (- mm) -> 2 fr (5.2 mm)
   horse stance: mane crest through itself @neck: 0 fr (- mm) -> 1 fr (9.0 mm)
   bull mantle: connected shirt and sleeves into forearm and hand -1 @neck: 0 fr (- mm) -> 1 fr (15.1 mm)
  ~sheep stance: fitted waistcoat with pointed hem into fitted neckerchief wrap @neck: 0 fr (- mm) -> 1 fr (3.0 mm)
   sheep stance: fitted neckerchief wrap into fitted waistcoat with pointed hem @neck: 0 fr (- mm) -> 1 fr (3.6 mm)
   sheep stance: fitted neckerchief wrap into connected shirt and sleeves @neck: 0 fr (- mm) -> 1 fr (3.5 mm)
   sheep fall: fitted waistcoat with pointed hem through itself @neck: 0 fr (- mm) -> 1 fr (7.0 mm)
  ~sheep mantle: connected shirt and sleeves into fitted neckerchief wrap @torso: 0 fr (- mm) -> 1 fr (4.0 mm)
  ~sheep ladder: connected shirt and sleeves into fitted neckerchief wrap @torso: 0 fr (- mm) -> 1 fr (3.2 mm)
   pig-foreman stance: connected trousers belt and braces into connected shirt and sleeves @neck: 0 fr (- mm) -> 1 fr (10.3 mm)
  ~rabbit stance: connected shirt and sleeves into fitted neckerchief wrap @neck: 0 fr (- mm) -> 1 fr (3.9 mm)
   dog stance: fitted neckerchief wrap into connected jacket shirt and sleeves @neck: 0 fr (- mm) -> 1 fr (8.7 mm)
   dog mantle: neckerchief end 1 into forearm and hand -1 @neck: 0 fr (- mm) -> 1 fr (4.1 mm)
   goat aim: forearm and hand 1 into goat beard @arm: 35 fr (10.0 mm) -> 35 fr (18.6 mm)
   goat aim: goat beard into forearm and hand 1 @neck: 35 fr (9.1 mm) -> 35 fr (17.9 mm)
  ~cow aim: unified cow skull ears and forehead tuft into neckerchief knot @neck: 20 fr (15.0 mm) -> 20 fr (16.1 mm)
   cow mantle: forearm and hand -1 into neckerchief knot @torso: 1 fr (17.5 mm) -> 1 fr (18.6 mm)
   sheep mantle: connected shirt and sleeves into forearm and hand -1 @neck: 2 fr (12.7 mm) -> 2 fr (21.7 mm)
  ~pig-foreman stance: unified pig skull folded ears and snout into connected trousers belt and braces @neck: 1 fr (20.2 mm) -> 1 fr (21.5 mm)
  ~pig-foreman fall: unified pig skull folded ears and snout into connected trousers belt and braces @neck: 7 fr (20.5 mm) -> 7 fr (21.9 mm)
   rabbit mantle: forearm and hand -1 into neckerchief knot @arm: 1 fr (17.5 mm) -> 1 fr (18.9 mm)
   rabbit ladder: connected shirt and sleeves through itself @neck: 1 fr (26.3 mm) -> 1 fr (27.9 mm)
   dog mantle: forearm and hand -1 into neckerchief knot @arm: 1 fr (7.1 mm) -> 1 fr (13.1 mm)
   dog mantle: forearm and hand -1 into neckerchief knot @torso: 1 fr (12.6 mm) -> 1 fr (14.4 mm)
  ~sheep stance: unified sheep skull ears and wool into fitted waistcoat with pointed hem @neck: 5 fr (8.9 mm) -> 3 fr (10.3 mm)
