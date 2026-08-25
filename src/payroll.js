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
 * Chênh lệch Pot = Pot cuối - Pot đầu
 *
 * Chênh lệch dương:
 * - Pot cuối nhiều hơn Pot đầu
 * - Cộng meso
 *
 * Chênh lệch âm:
 * - Pot cuối ít hơn Pot đầu
 * - Trừ meso
 */
export function calculateSalary(log) {
  const pinkPotChange = log.pink_pot_end - log.pink_pot_start;

  const purplePotChange = log.purple_pot_end - log.purple_pot_start;

  const pinkPotMesoAdjustment = pinkPotChange * log.pink_pot_price;

  const purplePotMesoAdjustment = purplePotChange * log.purple_pot_price;

  const totalPotMesoAdjustment =
    pinkPotMesoAdjustment + purplePotMesoAdjustment;

  const mesoNet = log.meso_end - log.meso_start + totalPotMesoAdjustment;

  const hours = log.meso_hour > 0 ? mesoNet / log.meso_hour : 0;

  const salary = hours * log.hourly_rate;

  return {
    ...log,

    // Số dương = Pot cuối lớn hơn đầu.
    // Số âm = Pot cuối nhỏ hơn đầu.
    pink_pot_change: pinkPotChange,
    purple_pot_change: purplePotChange,

    // Số dương = cộng meso.
    // Số âm = trừ meso.
    pink_pot_meso_adjustment: pinkPotMesoAdjustment,
    purple_pot_meso_adjustment: purplePotMesoAdjustment,

    total_pot_meso_adjustment: totalPotMesoAdjustment,

    meso_net: mesoNet,
    hours,
    salary,
  };
}
