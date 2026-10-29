/* Offline source poses. Use the consistent right-to-front drawings and their
 * mirrored body views; the lure is projected separately, so it never flips. */
'use strict';
window.FuchsiafishTurnSequence = {
  create({ image, frames = null, lure = false, columns = 6, rows = 4, size = 1536, anchorX = .5, anchorY = .5 }) {
    const angles = [0,4,8,12,18,26,40,58,76,90,104,122,140,154,162,168,172,176,180];
    const frameCount = angles.length;
    const width = image.naturalWidth / columns;
    const height = image.naturalHeight / rows;
    if (!image.complete || !width || !height || columns * rows !== 24) {
      throw new Error('The Fuchsiafish turn requires a loaded atlas of 24 complete poses.');
    }
    if (!frames && Math.abs(width - height) > 1) {
      throw new Error('Turn atlas cells must be square to preserve the character proportions.');
    }
    const poses = frames || Array.from({ length: frameCount }, (_, i) => ({
      x: (i % columns) * width, y: Math.floor(i / columns) * height,
      width, height, pivotX: anchorX * width, pivotY: anchorY * height, unitScale: size / width
    }));
    if (poses.length !== 24 || poses.some(p =>
      ![p.x, p.y, p.width, p.height, p.pivotX, p.pivotY, p.unitScale].every(Number.isFinite) ||
      p.x < 0 || p.y < 0 || p.width <= 0 || p.height <= 0 || p.unitScale <= 0 ||
      p.x + p.width > image.naturalWidth || p.y + p.height > image.naturalHeight)) {
      throw new Error('Turn atlas frame bounds must describe 24 complete, valid poses.');
    }

    function frameForFacing(facing) {
      const yaw = Math.acos(Math.max(-1, Math.min(1, facing)));
      return angles.reduce((best, angle, i) => Math.abs(angle - yaw * 180 / Math.PI) < Math.abs(angles[best] - yaw * 180 / Math.PI) ? i : best, 0);
    }

    return {
      frameCount,
      frameForFacing,
      draw(ctx, pose, alpha = 1) {
        if (alpha <= 0) return;
        const index = frameForFacing(pose.dir);
        const frame = poses[index <= 9 ? index : 18 - index];
        // One intact frame, one uniform scale: eyes, jaw, body and fins rotate
        // together. Banking in the scene is independent of the authored yaw.
        const scale = pose.s * frame.unitScale;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(pose.x, pose.y);
        ctx.rotate(pose.angle);
        ctx.scale(index > 9 ? -scale : scale, scale);
        ctx.drawImage(image, frame.x, frame.y, frame.width, frame.height,
          -frame.pivotX, -frame.pivotY, frame.width, frame.height);
        ctx.restore();
        if (lure) drawLure(ctx, pose, alpha);
      }
    };

    function drawLure(ctx, pose, alpha) {
      // The asymmetric appendage turns in depth continuously. It must never
      // switch to a mirrored stalk as the head passes the frontal direction.
      const yaw = Math.max(-1, Math.min(1, pose.dir));
      const front = Math.sqrt(Math.max(0, 1 - yaw * yaw));
      const points = [[220 * yaw, -240], [265 * yaw + 80 * front, -430],
        [460 * yaw + 240 * front, -455], [500 * yaw + 230 * front, -290]];
      const tip = points[3];
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(pose.x, pose.y);
      ctx.rotate(pose.angle);
      ctx.scale(pose.s, pose.s);
      ctx.lineCap = 'round';
      const stem = () => {
        ctx.beginPath(); ctx.moveTo(...points[0]);
        ctx.bezierCurveTo(...points[1], ...points[2], ...tip);
      };
      stem(); ctx.lineWidth = 25; ctx.strokeStyle = '#090612'; ctx.stroke();
      const metal = ctx.createLinearGradient(0, -450, 0, -230);
      metal.addColorStop(0, '#29142f'); metal.addColorStop(.48, '#6b386b');
      metal.addColorStop(.6, '#201626'); metal.addColorStop(1, '#090b16');
      stem(); ctx.lineWidth = 17; ctx.strokeStyle = metal; ctx.stroke();
      stem(); ctx.lineWidth = 3; ctx.strokeStyle = '#f34ad6'; ctx.stroke();
      const curve = u => {
        const v = 1 - u;
        return [0, 1].map(k => v*v*v*points[0][k] + 3*v*v*u*points[1][k] +
          3*v*u*u*points[2][k] + u*u*u*tip[k]);
      };
      for (let i = 1; i < 13; i++) {
        const u = i / 14, a = curve(u), b = curve(u + .001);
        const angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
        const dx = -Math.sin(angle) * 9, dy = Math.cos(angle) * 9;
        ctx.beginPath(); ctx.moveTo(a[0] - dx, a[1] - dy); ctx.lineTo(a[0] + dx, a[1] + dy);
        ctx.lineWidth = 2; ctx.strokeStyle = '#b383b9'; ctx.stroke();
      }
      const glow = ctx.createRadialGradient(...tip, 8, ...tip, 72);
      glow.addColorStop(0, '#ff60ee88'); glow.addColorStop(.5, '#f729df28'); glow.addColorStop(1, '#f729df00');
      ctx.fillStyle = glow; ctx.fillRect(tip[0] - 72, tip[1] - 72, 144, 144);
      const bulb = ctx.createRadialGradient(tip[0] - 9, tip[1] - 10, 2, ...tip, 38);
      bulb.addColorStop(0, '#fff0ff'); bulb.addColorStop(.5, '#ff9bf7'); bulb.addColorStop(1, '#e519d5');
      ctx.beginPath(); ctx.arc(...tip, 38, 0, Math.PI * 2);
      ctx.fillStyle = bulb; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#ffb1f8'; ctx.stroke();
      ctx.restore();
    }
  }
};
