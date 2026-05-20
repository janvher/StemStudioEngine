export const roundNumber = (number: number, precision: number): number => {
    return +parseFloat(`${number}`).toFixed(precision);
};
