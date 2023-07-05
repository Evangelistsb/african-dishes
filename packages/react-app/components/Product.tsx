/* eslint-disable @next/next/no-img-element */
// This component displays and enables the purchase of a product

// Importing the dependencies
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
// Import ethers to format the price of the product correctly
import { ethers } from "ethers";
// Import the useConnectModal hook to trigger the wallet connect modal
import { useConnectModal } from "@rainbow-me/rainbowkit";
// Import the useAccount hook to get the user's address
import { useAccount } from "wagmi";
// Import the toast library to display notification
import { toast } from "react-toastify";
// Import our custom identicon template to display the owner of the product
import { identiconTemplate } from "@/helpers";
// Import our custom hooks to interact with the smart contract
import { useContractApprove } from "@/hooks/contract/useApprove";
import { useContractCall } from "@/hooks/contract/useContractRead";
import { useContractSend } from "@/hooks/contract/useContractWrite";

// Define the interface for the product, an interface is a type that describes the properties of an object
interface Product {
  name: string;
  price: number;
  owner: string;
  image: string;
  description: string;
  sold: boolean;
}

// Define the Product component which takes in the id of the product and some functions to display notifications
const Product = ({ id, setError, setLoading, clear }: any) => {
  // Use the useAccount hook to store the user's address
  const { address } = useAccount();
  // Use the useContractCall hook to read the data of the product with the id passed in, from the marketplace contract
  const { data: rawProduct }: any = useContractCall("readProduct", [id], true);
  // use the useContractCall hook to read the reactions of a product
  const {data: deliciousReaction}: any = useContractCall("getReactions", [id, 1], true)
  const {data: whateverReaction}: any = useContractCall("getReactions", [id, 2], true)
  const {data: sourReaction}: any = useContractCall("getReactions", [id, 3], true)
  const {data: allergicReaction}: any = useContractCall("getReactions", [id, 4], true)
  const {data: expensiveReaction}: any = useContractCall("getReactions", [id, 5], true)
  const {data: suspeciousReaction}: any = useContractCall("getReactions", [id, 6], true)
  // Use the useContractSend hook to purchase the product with the id passed in, via the marketplace contract
  const { writeAsync: purchase } = useContractSend("buyProduct", [Number(id)]);
  // Use useContractSend hook to set a particular reaction
  const {writeAsync:setReaction} = useContractSend("setReaction", [Number(id), Number(0)]);

  // State variable
  const [product, setProduct] = useState<Product | null>(null);
  // Use the useContractApprove hook to approve the spending of the product's price, for the ERC20 cUSD contract
  const { writeAsync: approve } = useContractApprove(
    product?.price?.toString() || "0"
  );
  // Use the useConnectModal hook to trigger the wallet connect modal
  const { openConnectModal } = useConnectModal();
  // Format the product data that we read from the smart contract
  const getFormatProduct = useCallback(() => {
    if (!rawProduct) return null;
    setProduct({
      owner: rawProduct[0],
      name: rawProduct[1],
      image: rawProduct[2],
      description: rawProduct[3],
      price: Number(rawProduct[4]),
      sold: rawProduct[5].toString(),
    });
  }, [rawProduct]);

  // use the useContractCall hool to read the number of products the usr has created
  const {data: productsCreated}: any = useContractCall("getProductCreated", [product?.owner], true)

  // Call the getFormatProduct function when the rawProduct state changes
  useEffect(() => {
    getFormatProduct();
  }, [getFormatProduct]);

  // Define the handlePurchase function which handles the purchase interaction with the smart contract
  const handlePurchase = async () => {
    if (!approve || !purchase) {
      throw "Failed to purchase this product";
    }
    // Approve the spending of the product's price, for the ERC20 cUSD contract
    const approveTx = await approve();
    // Wait for the transaction to be mined, (1) is the number of confirmations we want to wait for
    await approveTx.wait(1);
    setLoading("Purchasing...");
    // Once the transaction is mined, purchase the product via our marketplace contract buyProduct function
    const res = await purchase();
    // Wait for the transaction to be mined
    await res.wait();
  };

  const handleReact = async (val: number) => {
    // If the writeAsync function is empty, throw error
    if (!setReaction) {
      throw "Failed to rate product"
    }
    const reactionTx = await setReaction({
      recklesslySetUnpreparedArgs: [Number(id), val]
    })
    setLoading("Mining transaction");
    await reactionTx.wait()
  }

  // Define the purchaseProduct function that is called when the user clicks the purchase button
  const purchaseProduct = async () => {
    setLoading("Approving ...");
    clear();

    try {
      // If the user is not connected, trigger the wallet connect modal
      if (!address && openConnectModal) {
        openConnectModal();
        return;
      }
      // If the user is connected, call the handlePurchase function and display a notification
      await toast.promise(handlePurchase(), {
        pending: "Purchasing product...",
        success: "Product purchased successfully",
        error: "Failed to purchase product",
      });
      // If there is an error, display the error message
    } catch (e: any) {
      console.log({ e });
      setError(e?.reason || e?.message || "Something went wrong. Try again.");
      // Once the purchase is complete, clear the loading state
    } finally {
      setLoading(null);
    }
  };

  const react = async (reaction: string, val: number) => {
    setLoading(`Reaction with ${reaction.toUpperCase()}`);
    try {
      // If the user is not connected, trigger the wallet connect modal
      if (!address && openConnectModal) {
        openConnectModal();
        return;
      }
      // If the user is connected, call the handlePurchase function and display a notification
      await toast.promise(handleReact(val), {
        pending: "Reacting...",
        success: "Reacted successfully",
        error: "Failed to react",
      });
    } catch (e: any) {
      console.log({ e });
      setError(e?.reason || e?.message || "Something went wrong. Try again.");
      // Once the purchase is complete, clear the loading state
    } finally {
      setLoading(null);
    }
  }

  // If the product cannot be loaded, return null
  if (!product) return null;

  // Format the price of the product from wei to cUSD otherwise the price will be way too high
  const productPriceFromWei = ethers.utils.formatEther(
    product.price.toString()
  );

  // Return the JSX for the product component
  return (
    <div className="relative group w-full lg:w-[370px]">
      <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
      <div className="relative px-1 py-1 bg-white ring-1 ring-gray-900/5 rounded-lg leading-none flex flex-col justify-start">
        {/* Product Image */}
        <img className="h-[300px] rounded-t-md" src={product.image}/>
        <div className="m-5">
          {/* Product Name */}
          <div className="mb-3 flex justify-between items-center m-auto">
            <div className="text-3xl">{product.name}</div>
            {/* Product price */}
            <div className="font-mono text-xl">${productPriceFromWei} cUSD</div>
          </div>
          {/* Product description */}
          <div className="text-gray-500 my-4">{product.description}</div>
          {/* List of reactions on product */}
          <div className="h-[60px] flex gap-2 justify-center items-center">
            <div className="flex flex-col items-center">
              <div className="text-gray-700">{deliciousReaction?.length || 0}</div>
              <div className="text-[35px] hover:text-[60px] cursor-pointer" onClick={() => react("delicious", 1)}>&#128523;</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-gray-700">{whateverReaction?.length || 0}</div>
              <div className="text-[35px] hover:text-[60px] cursor-pointer" onClick={() => react("whatever", 2)}>&#128528;</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-gray-700">{sourReaction?.length || 0}</div>
              <div className="text-[35px] hover:text-[60px] cursor-pointer" onClick={() => react("sour", 3)}>&#128534;</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-gray-700">{allergicReaction?.length || 0}</div>
              <div className="text-[35px] hover:text-[60px] cursor-pointer" onClick={() => react("allergic", 4)}>&#129314;</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-gray-700">{expensiveReaction?.length || 0}</div>
              <div className="text-[35px] hover:text-[60px] cursor-pointer" onClick={() => react("expensive", 5)}>&#129297;</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-gray-700">{suspeciousReaction?.length || 0}</div>
              <div className="text-[35px] hover:text-[60px] cursor-pointer" onClick={() => react("suspecious", 6)}>&#129488;</div>
            </div>

            {/* Purchase button */}
          </div>
          <div className="flex justify-center items-center mt-8 mb-5 w-full">
            <button onClick={purchaseProduct} className="w-full relative inline-flex items-center justify-center p-4 px-6 py-5 overflow-hidden font-medium text-indigo-600 transition duration-300 ease-out border-2 border-purple-500 rounded-full shadow-md group">
            <span className="absolute z-10 right-4 mb-10 bg-green-400 text-black p-1 rounded-lg px-4">{product.sold} sold</span>
              <span className="absolute inset-0 flex items-center justify-center w-full h-full text-white duration-300 -translate-x-full bg-purple-500 group-hover:translate-x-0 ease">
              <svg className="w-6 h-6 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 18 20">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 15a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm0 0h8m-8 0-1-4m9 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm-9-4h10l2-7H3m2 7L3 4m0 0-.792-3H1"/>
              </svg>            
              </span>
              <span className="absolute flex items-center justify-center w-full h-full text-purple-500 transition-all duration-300 transform group-hover:translate-x-full ease">Buy</span>
              <span className="relative invisible">Buy</span>
            </button>
          </div>
          <hr className="w-full"/>
          {/* Product owner details */}
          <div className="flex justify-start items-center gap-3 mt-4">
            {identiconTemplate(product.owner)}
            <div className="flex flex-col gap-1">
              <Link href={`https://explorer.celo.org/alfajores/address/${product.owner}`}>
                <div className="text-gray-500 font-mono text-sm w-[60px] overflow-hidden text-ellipsis">{product.owner}</div>
              </Link>
              <div className="text-gray-500">{Number(productsCreated)} products created</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Product;
