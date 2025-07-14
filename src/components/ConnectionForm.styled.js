import styled from 'styled-components';

export const FormContainer = styled.div`
  width: 420px;
  min-height: auto;
  margin: 48px auto 0 auto;
  padding: 32px 28px 24px 28px;
  background: #2d3340;
  border-radius: 18px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.12), 0 1.5px 4px rgba(0,0,0,0.08);
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #f5f6fa;
  /* Custom scrollbar for dark mode */
  &::-webkit-scrollbar {
    width: 10px;
    background: #2d3340;
  }
  &::-webkit-scrollbar-thumb {
    background: #3a3f4b;
    border-radius: 8px;
    border: 2px solid #2d3340;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: #50576a;
  }
  &::-webkit-scrollbar-track {
    background: #23272f;
    border-radius: 8px;
  }
  @media (max-width: 600px) {
    width: 98vw;
    min-height: auto;
    padding: 18px 2vw;
  }
`;

// Add a styled Box for button rows to keep their height stable
export const ButtonRow = styled.div`
  display: flex;
  gap: 16px;
  min-height: 48px;
  align-items: center;
`; 