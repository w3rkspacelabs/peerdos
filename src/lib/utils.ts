export function isValidEthAddress(address: string): boolean {
    // Check if the address starts with "0x" and is followed by 40 hexadecimal characters
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    return ethAddressRegex.test(address);
}

export async function getBalances(account: string) {
    const result = await fetch(`https://eth.blockscout.com/api/v2/addresses/${account}/tokens`);
    const data = await result.json();
    return data;
}

// Example usage:
//   console.log(isValidEthAddress('0x32Be343B94f860124dC4fEe278FDCBD38C102D88')); // true
//   console.log(isValidEthAddress('0xInvalidAddress1234567890abcdefg')); // false
