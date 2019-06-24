pragma solidity ^0.5.0;

contract dTokStreams {
    
    string internal constant ERROR_NO_STREAM_URL_PROVIDED = "NO_STREAM_URL_PROVIDED";

    struct Stream {
        string url;
        string title;
    }

    mapping(address => Stream) public streams; // One stream per address

    /*
    * @notice Create a record for a new dTok stream
    * @param _url The URL of the stream to be viewed via the Livepeer Media Player
    * @param _title The textual title / description of the stream
    */
    function createStream(string memory _url, string memory _title) public {

        require(bytes(_url).length > 0, ERROR_NO_STREAM_URL_PROVIDED);

        streams[msg.sender] = Stream(_url, _title);
    }
}
