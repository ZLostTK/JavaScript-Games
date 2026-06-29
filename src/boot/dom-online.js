import './dom.js';
import { Online } from '../modules/Online.js';
import { OnlineLobby } from '../modules/OnlineLobby.js';
import { installGlobals } from './install-globals.js';

installGlobals({ Online, OnlineLobby });
