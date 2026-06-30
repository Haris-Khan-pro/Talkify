import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/react";
import { Button } from "@heroui/react";

function App() {
  return (
    <>
      <h1 className="text-4xl text-red-400 bg-blue-400">Hi how r you</h1>
      <Button>My Button</Button>
      <header>
        <Show when="signed-out">
          <SignInButton mode="modal" />
          <SignUpButton mode="modal" />
        </Show>
        <Show when="signed-in">
          <UserButton />
        </Show>
      </header>
    </>
  );
}

export default App;
