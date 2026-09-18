export function toNumber(value) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    throw new Error("Số nhập không hợp lệ.");
  }

  return numberValue;
}

/**
 * Công thức:
 *
 * Chênh lệch item = số cuối - số đầu
 *
 * Số dương:
 * - Số lượng cuối nhiều hơn đầu
 * - Cộng meso
 *
 * Số âm:
 * - Số lượng cuối ít hơn đầu
 * - Trừ meso
 */
export function calculateSalary(log) {
  const pinkPotChange =
    toNumber(log.pink_pot_end ?? 0) -
    toNumber(log.pink_pot_start ?? 0);

  const purplePotChange =
    toNumber(log.purple_pot_end ?? 0) -
    toNumber(log.purple_pot_start ?? 0);

  const eelChange =
    toNumber(log.eel_end ?? 0) -
    toNumber(log.eel_start ?? 0);

  const pinkPotMesoAdjustment =
    pinkPotChange *
    toNumber(log.pink_pot_price ?? 0);

  const purplePotMesoAdjustment =
    purplePotChange *
    toNumber(log.purple_pot_price ?? 0);

  const eelMesoAdjustment =
    eelChange *
    toNumber(log.eel_price ?? 0);

  const totalPotMesoAdjustment =
    pinkPotMesoAdjustment +
    purplePotMesoAdjustment +
    eelMesoAdjustment;

  const mesoNet =
    toNumber(log.meso_end) -
    toNumber(log.meso_start) +
    totalPotMesoAdjustment;

  const mesoPerHour = toNumber(log.meso_hour);

  const hours =
    mesoPerHour > 0
      ? mesoNet / mesoPerHour
      : 0;

  const salary =
    hours * toNumber(log.hourly_rate);

  return {
    ...log,

    pink_pot_change: pinkPotChange,
    purple_pot_change: purplePotChange,
    eel_change: eelChange,

    pink_pot_meso_adjustment: pinkPotMesoAdjustment,
    purple_pot_meso_adjustment: purplePotMesoAdjustment,
    eel_meso_adjustment: eelMesoAdjustment,

    total_pot_meso_adjustment: totalPotMesoAdjustment,

    meso_net: mesoNet,
    hours,
    salary,
  };
}