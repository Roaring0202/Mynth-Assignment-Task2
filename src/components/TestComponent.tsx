import React from 'react';
import useHandleSwap from '../hooks/useHandleSwap';

const TestComponent = () => {
  const { handleSwap, loading, error } = useHandleSwap();

  return (
    <div>
      <button onClick={handleSwap}>Swap</button>
      {loading && <span>Loading...</span>}
      {error && <span>{error}</span>}
    </div>
  );
};

export default TestComponent;
