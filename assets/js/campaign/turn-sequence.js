/* Continuous sampling of locally motion-compensated, registered yaw poses. */
'use strict';
window.FuchsiafishTurnSequence = {
  create({ image, atlas }) {
    const { frameCount, columns, width, height, pivotX, pivotY, unitScale } = atlas || {};
    if (!image.complete || !image.naturalWidth ||
        ![frameCount, columns, width, height, pivotX, pivotY, unitScale].every(Number.isFinite) ||
        ![frameCount, columns, width, height].every(Number.isInteger) ||
        frameCount < 2 || columns < 1 || width < 1 || height < 1 || unitScale <= 0 ||
        columns * width > image.naturalWidth || Math.ceil(frameCount / columns) * height > image.naturalHeight) {
      throw new Error('The turn atlas must contain complete, uniformly registered yaw samples.');
    }
    const buffer = document.createElement('canvas');
    buffer.width = width; buffer.height = height;
    const blend = buffer.getContext('2d', { alpha: true });
    if (!blend) throw new Error('Canvas is unavailable for turn playback.');
    let previousSample = -1;
    const sampleForFacing = facing => Math.acos(Math.max(-1, Math.min(1, facing))) / Math.PI * (frameCount - 1);
    const frameForFacing = facing => Math.round(sampleForFacing(facing));
    function prepare(sample) {
      if (sample === previousSample) return;
      previousSample = sample;
      const first = Math.floor(sample), next = Math.min(first + 1, frameCount - 1), mix = sample - first;
      const crop = index => blend.drawImage(image, (index % columns) * width, Math.floor(index / columns) * height,
        width, height, 0, 0, width, height);
      // These adjacent samples are only 1.4 degrees apart and already motion
      // compensated offline. Premultiplied addition preserves silhouette alpha;
      // ordinary source-over blending would make it fade in the middle.
      blend.clearRect(0, 0, width, height);
      blend.globalCompositeOperation = 'source-over';
      blend.globalAlpha = 1 - mix; crop(first);
      if (mix > 0) {
        blend.globalCompositeOperation = 'lighter';
        blend.globalAlpha = mix; crop(next);
      }
      blend.globalAlpha = 1;
      blend.globalCompositeOperation = 'source-over';
    }
    return {
      frameCount, frameForFacing, sampleForFacing,
      draw(ctx, pose, alpha = 1, displacement = null) {
        if (alpha <= 0) return;
        prepare(sampleForFacing(pose.dir));
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(pose.x, pose.y);
        ctx.rotate(pose.angle);
        ctx.scale(pose.s, pose.s);
        const left = -pivotX * unitScale, top = -pivotY * unitScale;
        const nativeWidth = width * unitScale, nativeHeight = height * unitScale;
        if (!displacement) {
          ctx.drawImage(buffer, left, top, nativeWidth, nativeHeight);
        } else {
          // Carry the accepted tail/body wave through the turn and both
          // endpoint handoffs. Source and side rig use the same native units.
          for (let x = 0; x < nativeWidth; x += 32) {
            const w = Math.min(32, nativeWidth - x), dx = left + x;
            const y = displacement(dx), slope = (displacement(dx + w) - y) / w;
            ctx.save(); ctx.transform(1, slope, 0, 1, 0, y - slope * dx);
            ctx.drawImage(buffer, x / unitScale, 0, w / unitScale, height,
              dx, top, w + .35, nativeHeight);
            ctx.restore();
          }
        }
        ctx.restore();
      }
    };
  }
};
