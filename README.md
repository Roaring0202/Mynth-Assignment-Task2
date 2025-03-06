## **Overview of the Original Module’s Functionality**

The original `useHandleSwap` module is designed to handle the logic for swapping cryptocurrencies between different blockchains (e.g., Cardano, Tron). The key functionality includes:

- Handling user-initiated swap requests.
- Checking wallet balances (Cardano, Tron).
- Processing transactions on the respective blockchain (Cardano via UTXOs and Tron via balance checks).
- Sending API requests to a backend for transaction building and executing swaps.
- Handling various user interactions, such as displaying loading, success, or error modals during the swap process.
- Supporting Cardano and Tron wallets with different logic paths for each blockchain type.

The module manages different blockchain operations, ensuring the user has sufficient funds and interacts with the respective wallets' APIs to handle the swap process. It provides real-time feedback to users during the transaction process.

---

## **Refactoring Changes**

### **1. Code Structure and Modularity Improvements**

The original code had a single function (`handleSwap`) that contained all of the logic for Cardano and Tron swaps. This caused a significant mix of concerns and made the code harder to maintain.

**Changes made:**
- **Separation of concerns**: Refactored the main `handleSwap` function to delegate responsibilities to two specific functions:
  - `handleSwapFromCardanoWallet`: Handles all Cardano-related logic, including balance checks, transaction building, and API calls.
  - `handleSwapFromTronLinkWallet`: Handles all Tron-related logic, including balance checks, transaction building, and API calls.
  
**Reasoning**: 
- By splitting the logic into smaller functions, each handling a specific blockchain, we improve code readability, maintainability, and make it easier to add support for additional blockchains in the future.

### **2. Enhanced Error Handling**

The original code did not handle errors gracefully in certain cases, especially API errors or wallet issues.

**Changes made:**
- Added improved error handling using the custom `useHandleApiError` hook.
- Introduced a better user feedback mechanism through modals (`showProcessModal`, `showSuccessModal`).
  
**Reasoning**:
- This change ensures that any issues (e.g., insufficient funds, API failures, transaction errors) are reported back to the user in a clear and actionable way, improving the user experience.

### **3. Modular API Calls and Wallet Integration**

The original module performed API requests and wallet interactions in a single block of code, making it difficult to test and mock the individual interactions.

**Changes made:**
- Refactored API calls (e.g., `axios.post`) into separate service functions for better isolation.
- Simplified wallet interaction logic by abstracting it into dedicated functions (`useCardano`, `useTronlink`).
  
**Reasoning**:
- Modularizing API calls and wallet integration improves code organization and testing coverage by isolating side effects and external dependencies.

### **4. Unit Test Coverage**

The original module lacked unit tests for key functionality, making it harder to verify correctness during changes and refactoring.

**Changes made:**
- Added unit tests for key functions like `handleSwap`, `handleSwapFromCardanoWallet`, `handleSwapFromTronLinkWallet`, and error handling logic.
- Mocked external dependencies (API calls, wallet interactions) for isolated testing.

**Reasoning**:
- Introducing tests allows for better verification of the module’s functionality, ensuring no regressions when future changes are made. It also increases confidence in the module's stability across different scenarios.

---

## **Setting Up the Development Environment**

### **1. Install Node.js and NPM**
Ensure you have **Node.js** and **npm** installed on your machine. You can download and install them from [here](https://nodejs.org/).

### **2. Install Project Dependencies**
Clone the repository and navigate to the project folder. Install the required dependencies by running:

```bash
git clone https://github.com/Roaring0202/Mynth-Assignment-Task2.git
cd Mynth-Assignment-Task2
npm install
```

### **3. Configure Environment Variables**
Set up any necessary environment variables or configurations for your API calls. This will include backend URLs and other wallet API configurations. You can add these to a `.env` file in the project root.

### **4. Running the Module**
To run the module locally, use the following command to start the development environment:

```bash
npm start
```

This should start the module and make it available for testing and development.

---

## **Running Unit Tests**

### **1. Running Tests Locally**
To run the unit tests for the module, you can use **Jest** (a JavaScript testing framework) and **React Testing Library**.

If Jest is not yet installed, install it using:

```bash
npm install --save-dev jest @testing-library/react-hooks @testing-library/react
```

To execute the tests, run the following command:

```bash
npm test
```

This will run all tests in the `__tests__` folder and display the results in your terminal.

### **2. Running Specific Tests**
If you'd like to run a specific test file, use:

```bash
npm test useHandleSwap.test.js
```

---

## **Experience During Refactoring**

The refactoring process was both challenging and rewarding. Here are some key takeaways and resources that helped me during this process:

### **Challenges Faced:**
- **Code Duplication**: The original module had considerable duplicated logic between blockchain types. This required thoughtful refactoring to ensure that each blockchain-specific logic was handled cleanly and separately.
- **Error Handling**: A key challenge was ensuring proper error handling and feedback mechanisms for the user. I had to ensure that every potential failure path was covered and communicated back to the user effectively.

### **Resources that were helpful:**
1. **Jest Documentation**: [Jest Testing Docs](https://jestjs.io/docs/en/getting-started) - This was crucial for mocking external dependencies and creating unit tests.
2. **React Testing Library**: [React Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/) - This helped in rendering and interacting with the custom hook in a test environment.
3. **MDN Web Docs**: [Error Handling in JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling) - Great resource for ensuring robust error handling in JavaScript.
4. **Cardano Documentation**: [Cardano Wallet Docs](https://developers.cardano.org/docs/) - Provided guidance on interacting with the Cardano blockchain API.
5. **Tron Documentation**: [TronLink Docs](https://developers.tron.network/) - Useful for integrating with TronLink wallet.

---

## **Concluding Remarks**

This refactoring significantly improved the structure and testability of the `useHandleSwap` module. By separating concerns, handling errors more gracefully, and adding test coverage, we have made the code more maintainable and resilient to future changes. The process also deepened my understanding of modular architecture and API integration, and it was rewarding to see the module become more efficient and user-friendly.