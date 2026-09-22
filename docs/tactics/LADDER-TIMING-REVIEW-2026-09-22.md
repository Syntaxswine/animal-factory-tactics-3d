# Ten-second ladder timing

Retimes the presentation study from `f858f3f` to **10 seconds** for each supported animal and fixture. The approach and rung climbing occupy 8.6 seconds. The two final landing steps take 0.45 seconds each; the hand releases take 0.30 and 0.20 seconds. Descent reverses the same timed sequence.

The retiming wrapper preserves the original geometric trajectory and route-compilation clock. Public duration, phases and elapsed time use playback seconds; `poseTime` and phase `poseStart`/`poseEnd` identify the original trajectory time. Existing fixture adaptations and equipment holds still apply.

The viewer now accumulates progress in a full-precision variable. The range slider is display/input only: accumulating its rounded value had made nominal ten-second playback finish around 8.4 seconds on a 60 Hz display. Normal disposal also now removes the temporary dog-paint attribute, with regression coverage.

Validation: **14 focused tests passed**, **44 browser configurations / 88 directions / 18,280 phase samples** passed without browser errors, and the 3D build passed. Independent old/new pose comparisons for the horse and director on both fixtures found unchanged bone matrices at mapped trajectory times; reverse-playback error remained below `2e-13`.

Independent hostile review: **9/10**. Actual Play-button completion measured 10.009 seconds for the compact horse, 10.010 seconds for the tower horse, and 10.005 seconds for director descent. The reviewer approved the accelerated landing as readable within the existing presentation-only scope and fixture limitations.
